import JSZip from 'jszip';
import { Parser } from 'htmlparser2';
import { SchoolError } from './contracts';

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const MAX_ATTACHMENT_TEXT = 100000;
export const ATTACHMENT_ACCEPT = '.xlsx,.docx,.csv,.txt,.md,.pdf,.png,.jpg,.jpeg';
const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};
export function attachmentFormat(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (!['xlsx', 'docx', 'csv', 'txt', 'md', ...Object.keys(MIME)].includes(ext))
    throw new SchoolError(
      415,
      '支持 XLSX、DOCX、CSV、TXT、MD、PDF、PNG、JPG；旧版 XLS/DOC 请另存为新格式',
    );
  return { ext, mime: MIME[ext], cloud: Boolean(MIME[ext]) };
}
function xml(input: string, handlers: ConstructorParameters<typeof Parser>[0]) {
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) throw new SchoolError(400, '附件 XML 含不支持的声明');
  const parser = new Parser(handlers, { xmlMode: true, decodeEntities: true });
  parser.end(input);
}
async function officeArchive(bytes: Buffer) {
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.values(zip.files);
  // Check ZIP directory sizes before decompression; never extract files to disk.
  if (files.length > 2000) throw new SchoolError(413, 'Office 文件结构过大');
  let expanded = 0;
  for (const file of files) {
    const size = (file as unknown as { _data?: { uncompressedSize?: number } })._data
      ?.uncompressedSize;
    if (!file.dir && (size === undefined || size > 8 * 1024 * 1024))
      throw new SchoolError(413, 'Office 文件解压后过大');
    expanded += size ?? 0;
  }
  if (expanded > 24 * 1024 * 1024) throw new SchoolError(413, 'Office 文件解压后过大');
  return zip;
}
export async function extractLocalAttachment(bytes: Buffer, name: string): Promise<string> {
  const { ext, cloud } = attachmentFormat(name);
  if (cloud) throw new SchoolError(400, '此文件需要配置文档解析服务');
  let output = '';
  if (['txt', 'md', 'csv'].includes(ext)) {
    try {
      output = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new SchoolError(400, '文本或 CSV 请保存为 UTF-8 编码');
    }
  } else {
    const zip = await officeArchive(bytes);
    if (ext === 'docx') {
      const source = zip.file('word/document.xml');
      if (!source) throw new SchoolError(400, '不是有效的 DOCX 文件');
      let inText = false;
      xml(await source.async('string'), {
        onopentag(tag) {
          if (tag === 'w:t') inText = true;
          if (tag === 'w:tab') output += '\t';
        },
        ontext(value) {
          if (inText) output += value;
        },
        onclosetag(tag) {
          if (tag === 'w:t') inText = false;
          if (tag === 'w:p' || tag === 'w:tr') output += '\n';
          if (tag === 'w:tc') output += '\t';
        },
      });
    } else {
      const strings: string[] = [];
      let shared = '',
        inText = false;
      const source = zip.file('xl/sharedStrings.xml');
      if (source)
        xml(await source.async('string'), {
          onopentag(tag) {
            if (tag === 'si') shared = '';
            if (tag === 't') inText = true;
          },
          ontext(value) {
            if (inText) shared += value;
          },
          onclosetag(tag) {
            if (tag === 't') inText = false;
            if (tag === 'si') strings.push(shared);
          },
        });
      const sheets = Object.keys(zip.files)
        .filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))
        .sort();
      if (!sheets.length || sheets.length > 30)
        throw new SchoolError(400, 'Excel 工作表缺失或超过30张');
      output =
        '【Excel 单元格提取】保留单元格坐标、空白列间隔；日期可能为原始序号，公式仅读取已缓存结果，不计算公式、图表、批注或隐藏状态。请核对原表。\n';
      for (const path of sheets) {
        output += `\n【工作表 ${path.split('/').pop()}】\n`;
        let ref = '',
          type = '',
          value = '',
          formula = '',
          reading = '',
          cells = 0;
        xml(await zip.file(path)!.async('string'), {
          onopentag(tag, attrs) {
            if (tag === 'c') {
              ref = attrs.r ?? '?';
              type = attrs.t ?? '';
              value = '';
              formula = '';
            }
            if (['v', 't', 'f'].includes(tag)) reading = tag;
          },
          ontext(chunk) {
            if (reading === 'f') formula += chunk;
            else if (reading) value += chunk;
          },
          onclosetag(tag) {
            if (['v', 't', 'f'].includes(tag)) reading = '';
            if (tag === 'c') {
              if (++cells > 20000) throw new SchoolError(413, 'Excel 超过20000个单元格，请拆分');
              const resolved = type === 's' ? (strings[Number(value)] ?? '') : value;
              if (resolved || formula)
                output += `${ref}: ${resolved || '[公式无缓存结果]'}${formula ? ' [公式缓存值，未计算]' : ''}\t`;
            }
            if (tag === 'row') output += '\n';
          },
        });
        if (output.length > MAX_ATTACHMENT_TEXT)
          throw new SchoolError(413, '解析内容超过10万字，请拆分文件');
      }
    }
  }
  if (!output.trim() || output.includes('\0'))
    throw new SchoolError(422, '未提取到有效文本，请核对文件或使用 OCR');
  if (output.length > MAX_ATTACHMENT_TEXT)
    throw new SchoolError(413, '解析内容超过10万字，请拆分文件');
  return output.trim();
}
