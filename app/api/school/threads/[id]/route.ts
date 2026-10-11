import type { NextRequest } from 'next/server';
import { schoolRoute } from '@/lib/school/http';
import { schoolDb } from '@/lib/school/store';
import { SchoolError, uuid } from '@/lib/school/contracts';
type Params = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export function GET(req: NextRequest, { params }: Params) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const id = uuid((await params).id);
    const result = await pool.query(
      `SELECT t.request_id,t.message,t.answer,t.citations,t.created_at,u.skill_id,u.rating,
      CASE WHEN u.status='running' AND u.created_at<now()-interval '2 minutes' THEN 'interrupted' ELSE u.status END AS status
      FROM school_teacher_turns t JOIN school_teacher_usage u USING(owner_id,request_id)
      WHERE t.owner_id=$1 AND t.thread_id=$2 ORDER BY t.created_at DESC LIMIT 50`,
      [principal.ownerId, id],
    );
    if (!result.rows.length) throw new SchoolError(404, '对话不存在或无权访问');
    return { turns: result.rows.reverse() };
  });
}
export function DELETE(req: NextRequest, { params }: Params) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const id = uuid((await params).id);
    await pool.query('DELETE FROM school_teacher_turns WHERE owner_id=$1 AND thread_id=$2', [
      principal.ownerId,
      id,
    ]);
    await pool.query(
      "UPDATE school_chat_attachments SET status='removed',content='' WHERE owner_id=$1 AND thread_id=$2",
      [principal.ownerId, id],
    );
    return { ok: true };
  });
}
