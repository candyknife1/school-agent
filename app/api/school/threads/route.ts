import type { NextRequest } from 'next/server';
import { schoolRoute } from '@/lib/school/http';
import { schoolDb } from '@/lib/school/store';
export const runtime = 'nodejs';
export function GET(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const result = await pool.query(
      `SELECT thread_id, min(created_at) AS created_at,max(created_at) AS updated_at,
      (array_agg(left(message,50) ORDER BY created_at ASC))[1] AS title FROM school_teacher_turns
      WHERE owner_id=$1 GROUP BY thread_id ORDER BY max(created_at) DESC LIMIT 50`,
      [principal.ownerId],
    );
    return { threads: result.rows };
  });
}
