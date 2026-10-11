import type { NextRequest } from 'next/server';
import { uuid, SchoolError } from '@/lib/school/contracts';
import { readJson, schoolRoute } from '@/lib/school/http';
import { schoolDb, isSchoolAdmin } from '@/lib/school/store';
type Params = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export function GET(req: NextRequest, { params }: Params) {
  return schoolRoute(req, async (principal) => {
    const id = uuid((await params).id);
    const pool = await schoolDb();
    const result = await pool.query(
      `SELECT id,title,category,subject,content,visibility FROM school_knowledge
      WHERE id=$1 AND (owner_id=$2 OR visibility='school' OR ($3 AND visibility='submitted'))`,
      [id, principal.ownerId, isSchoolAdmin(principal)],
    );
    if (!result.rows.length) throw new SchoolError(404, '资料不存在或无权访问');
    return result.rows[0];
  });
}
export function PATCH(req: NextRequest, { params }: Params) {
  return schoolRoute(req, async (principal) => {
    if (!isSchoolAdmin(principal)) throw new SchoolError(403, '仅已验证管理员可以审核共享资料');
    const id = uuid((await params).id);
    const body = (await readJson(req, 1000)) as { action?: string };
    if (!body || !['approve', 'reject', 'unpublish'].includes(body.action ?? ''))
      throw new SchoolError(400, '无效审核操作');
    const pool = await schoolDb();
    const state = body.action === 'approve' ? 'school' : 'private';
    const previous = body.action === 'unpublish' ? 'school' : 'submitted';
    const updated = await pool.query(
      'UPDATE school_knowledge SET visibility=$1,updated_at=now() WHERE id=$2 AND visibility=$3 RETURNING id',
      [state, id, previous],
    );
    if (!updated.rowCount) throw new SchoolError(404, '资料不存在或状态已改变');
    return { ok: true };
  });
}
export function DELETE(req: NextRequest, { params }: Params) {
  return schoolRoute(req, async (principal) => {
    const id = uuid((await params).id);
    const pool = await schoolDb();
    const result = await pool.query(
      "DELETE FROM school_knowledge WHERE id=$1 AND (owner_id=$2 OR ($3 AND visibility IN ('submitted','school'))) RETURNING id",
      [id, principal.ownerId, isSchoolAdmin(principal)],
    );
    if (!result.rowCount) throw new SchoolError(404, '资料不存在或无权删除');
    return { ok: true };
  });
}
