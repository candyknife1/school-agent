import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { parseKnowledge, SchoolError } from '@/lib/school/contracts';
import { readJson, schoolRoute } from '@/lib/school/http';
import { schoolDb, isSchoolAdmin } from '@/lib/school/store';
export const runtime = 'nodejs';
export function GET(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const admin = isSchoolAdmin(principal);
    const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 100);
    const result = await pool.query(
      `SELECT id,title,category,subject,visibility,created_at,
      owner_id=$1 AS is_owner, length(content) AS characters FROM school_knowledge
      WHERE (owner_id=$1 OR visibility='school' OR ($2 AND visibility='submitted'))
      AND ($3='' OR strpos(lower(title || ' ' || category),lower($3))>0)
      ORDER BY created_at DESC LIMIT 200`,
      [principal.ownerId, admin, q],
    );
    return { resources: result.rows, admin, identity: principal.kind };
  });
}
export function POST(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const data = parseKnowledge(await readJson(req));
    const pool = await schoolDb();
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `school-knowledge:${principal.ownerId}`,
      ]);
      const count = await tx.query(
        'SELECT count(*)::int AS count FROM school_knowledge WHERE owner_id=$1',
        [principal.ownerId],
      );
      if (count.rows[0].count >= 100)
        throw new SchoolError(409, '每个用户最多保存100份资料，请先清理旧资料');
      const id = randomUUID();
      await tx.query(
        'INSERT INTO school_knowledge(id,owner_id,title,category,subject,content,visibility) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          id,
          principal.ownerId,
          data.title,
          data.category,
          data.subject,
          data.content,
          data.visibility,
        ],
      );
      await tx.query('COMMIT');
      return { id };
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }
  });
}
