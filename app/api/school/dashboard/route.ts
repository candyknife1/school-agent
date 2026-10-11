import type { NextRequest } from 'next/server';
import { schoolRoute, readJson } from '@/lib/school/http';
import { schoolDb, isSchoolAdmin } from '@/lib/school/store';
import { SchoolError, parseDays, uuid } from '@/lib/school/contracts';
export const runtime = 'nodejs';
export function GET(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const days = parseDays(req.nextUrl.searchParams.get('days'));
    const schoolScope = req.nextUrl.searchParams.get('scope') === 'school';
    if (schoolScope && !isSchoolAdmin(principal))
      throw new SchoolError(403, '校级数据仅向已验证管理员开放');
    const values = [principal.ownerId, schoolScope, days];
    const filter = "WHERE (owner_id=$1 OR $2) AND created_at >= now()-($3::int * interval '1 day')";
    const totals = await pool.query(
      `SELECT count(*)::int AS requests,
      count(*) FILTER(WHERE status='succeeded')::int AS succeeded,
      count(*) FILTER(WHERE status='failed')::int AS failed,
      count(*) FILTER(WHERE status='running' AND created_at>=now()-interval '2 minutes')::int AS running,
      count(*) FILTER(WHERE status='running' AND created_at<now()-interval '2 minutes')::int AS interrupted,
      count(DISTINCT owner_id)::int AS active_owners,
      COALESCE(sum(cardinality(resource_ids)) FILTER(WHERE status='succeeded'),0)::int AS resource_references,
      COALESCE(sum(input_tokens+output_tokens),0)::bigint AS tokens,
      COALESCE(round(avg(latency_ms) FILTER(WHERE status='succeeded')),0)::int AS avg_latency_ms,
      count(*) FILTER(WHERE rating IS NOT NULL)::int AS rated,
      count(*) FILTER(WHERE rating=1)::int AS useful FROM school_teacher_usage ${filter}`,
      values,
    );
    const skills = await pool.query(
      `SELECT COALESCE(skill_id,'general') AS key,count(*)::int AS count,
      count(*) FILTER(WHERE status='succeeded')::int AS succeeded FROM school_teacher_usage ${filter}
      GROUP BY skill_id ORDER BY count DESC`,
      values,
    );
    const categories = await pool.query(
      `SELECT category AS key,count(*)::int AS count FROM school_teacher_usage ${filter} GROUP BY category ORDER BY count DESC`,
      values,
    );
    const subjects = await pool.query(
      `SELECT subject AS key,count(*)::int AS count FROM school_teacher_usage ${filter} GROUP BY subject ORDER BY count DESC`,
      values,
    );
    const trend = await pool.query(
      `SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai','YYYY-MM-DD') AS day,
      count(*)::int AS count,count(*) FILTER(WHERE status='succeeded')::int AS succeeded
      FROM school_teacher_usage ${filter} GROUP BY day ORDER BY day`,
      values,
    );
    return {
      totals: totals.rows[0],
      skills: skills.rows,
      categories: categories.rows,
      subjects: subjects.rows,
      trend: trend.rows,
      admin: isSchoolAdmin(principal),
      scope: schoolScope ? 'school' : 'personal',
      days,
    };
  });
}
export function PATCH(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const body = (await readJson(req, 1000)) as { requestId?: unknown; rating?: unknown };
    if (!body || ![-1, 1].includes(body.rating as number))
      throw new SchoolError(400, '反馈只能选择有帮助或待改进');
    const id = uuid(body.requestId);
    const pool = await schoolDb();
    const result = await pool.query(
      "UPDATE school_teacher_usage SET rating=$1 WHERE owner_id=$2 AND request_id=$3 AND status='succeeded' RETURNING request_id",
      [body.rating, principal.ownerId, id],
    );
    if (!result.rowCount) throw new SchoolError(404, '记录不存在或尚未成功');
    return { ok: true };
  });
}
