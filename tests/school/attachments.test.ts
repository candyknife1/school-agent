import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { attachmentFormat, extractLocalAttachment } from '@/lib/school/attachments';
import { parseChat, parseCommunity } from '@/lib/school/contracts';
const chat = {
  requestId: '00000000-0000-4000-8000-000000000001',
  threadId: '00000000-0000-4000-8000-000000000002',
  message: '分析试卷',
  grade: '三年级',
  subject: '语文',
  resourceIds: [],
};
async function archive(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, value] of Object.entries(files)) zip.file(name, value);
  return zip.generateAsync({ type: 'nodebuffer' });
}
describe('teacher attachments', () => {
  it('reads UTF-8 CSV without dropping column separators or quoted values', async () => {
    const value = '题号,得分\n1,"8,9"\n2,10';
    expect(await extractLocalAttachment(Buffer.from(value), '成绩.csv')).toBe(value);
  });
  it('rejects invalid encoding, empty input and unsupported extensions', async () => {
    await expect(extractLocalAttachment(Buffer.from([0xff]), '成绩.csv')).rejects.toThrow('UTF-8');
    await expect(extractLocalAttachment(Buffer.from(' '), 'x.txt')).rejects.toThrow('有效文本');
    expect(() => attachmentFormat('成绩.xls')).toThrow('新格式');
  });
  it('marks PDF/photos as service-bound rather than pretending OCR is local', () => {
    expect(attachmentFormat('试卷.PDF')).toEqual({
      ext: 'pdf',
      mime: 'application/pdf',
      cloud: true,
    });
  });
  it('extracts DOCX paragraphs and table cells and decodes escaped characters', async () => {
    const bytes = await archive({
      'word/document.xml':
        '<w:document><w:p><w:r><w:t>阅读 &amp; 表达</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>题号</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>分数</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:document>',
    });
    const text = await extractLocalAttachment(bytes, '试卷.docx');
    expect(text).toContain('阅读 & 表达');
    expect(text).toContain('题号');
    expect(text).toContain('\t');
  });
  it('extracts shared strings, inline cells, sparse coordinates and formula cache without evaluation', async () => {
    const bytes = await archive({
      'xl/sharedStrings.xml': '<sst><si><t>题号</t></si></sst>',
      'xl/worksheets/sheet1.xml':
        '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="D1" t="inlineStr"><is><t>得分</t></is></c></row><row><c r="A2"><v>1</v></c><c r="D2"><f>SUM(A2:C2)</f><v>9</v></c><c r="E2"><f>NOW()</f></c></row></sheetData></worksheet>',
    });
    const text = await extractLocalAttachment(bytes, '成绩.xlsx');
    expect(text).toContain('A1: 题号');
    expect(text).toContain('D1: 得分');
    expect(text).toContain('D2: 9');
    expect(text).toContain('公式无缓存结果');
    expect(text).not.toContain('NOW()');
  });
  it('rejects malformed office archives and entity declarations', async () => {
    await expect(
      extractLocalAttachment(await archive({ 'foo.xml': 'x' }), '试卷.docx'),
    ).rejects.toThrow('有效的 DOCX');
    await expect(
      extractLocalAttachment(
        await archive({ 'word/document.xml': '<!DOCTYPE x><w:t>x</w:t>' }),
        '试卷.docx',
      ),
    ).rejects.toThrow('声明');
  });
  it('rejects oversized expanded XML before reading it', async () => {
    const bytes = await archive({ 'word/document.xml': 'x'.repeat(8 * 1024 * 1024 + 1) });
    await expect(extractLocalAttachment(bytes, 'x.docx')).rejects.toThrow('解压后过大');
  });
  it('validates attachment IDs and keeps old chat requests compatible', () => {
    expect(parseChat(chat).attachmentIds).toEqual([]);
    expect(() => parseChat({ ...chat, attachmentIds: ['foreign'] })).toThrow();
    expect(() => parseChat({ ...chat, attachmentIds: Array(4).fill(chat.threadId) })).toThrow(
      '3份',
    );
  });
  it('validates discussion, notice and one-level reply inputs', () => {
    expect(
      parseCommunity({ kind: 'notice', author: '访客', title: '试用', content: '提醒' }).kind,
    ).toBe('notice');
    expect(parseCommunity({ parentId: chat.threadId, author: '访客', content: '回复' }).kind).toBe(
      'reply',
    );
    expect(() =>
      parseCommunity({ kind: 'admin', author: 'x', title: 'x', content: 'x' }),
    ).toThrow();
    expect(() =>
      parseCommunity({ kind: 'discussion', author: '', title: 'x', content: 'x' }),
    ).toThrow();
  });
});
