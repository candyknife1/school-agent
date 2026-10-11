import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { schoolRoute, readJson } from '@/lib/school/http';
import { schoolDb, isSchoolAdmin } from '@/lib/school/store';
import { parseCommunity, SchoolError, uuid } from '@/lib/school/contracts';
export const runtime = 'nodejs';
export function GET(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const posts = await pool.query(
      `SELECT id,parent_id,kind,author,title,content,created_at,(owner_id=$1) AS is_owner
      FROM school_community_posts WHERE parent_id IS NULL ORDER BY created_at DESC LIMIT 50`,
      [principal.ownerId],
    );
    const replies = await pool.query(
      `SELECT id,parent_id,kind,author,title,content,created_at,(owner_id=$1) AS is_owner
      FROM school_community_posts WHERE parent_id=ANY($2::uuid[]) ORDER BY created_at DESC LIMIT 500`,
      [principal.ownerId, posts.rows.map((row) => row.id)],
    );
    return { posts: posts.rows, replies: replies.rows.reverse(), admin: isSchoolAdmin(principal) };
  });
}
export function POST(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const data = parseCommunity(await readJson(req, 4000));
    const tx = await (await schoolDb()).connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `school-community:${principal.ownerId}`,
      ]);
      const count = await tx.query(
        "SELECT count(*)::int AS count FROM school_community_events WHERE owner_id=$1 AND created_at>now()-interval '1 hour'",
        [principal.ownerId],
      );
      if (count.rows[0].count >= 20)
        throw new SchoolError(429, '每小时最多发布20条心得、通知或回复');
      if (data.parentId) {
        const parent = await tx.query(
          'SELECT id FROM school_community_posts WHERE id=$1 AND parent_id IS NULL FOR KEY SHARE',
          [data.parentId],
        );
        if (!parent.rows.length) throw new SchoolError(404, '讨论不存在，请刷新');
      }
      const id = randomUUID();
      await tx.query(
        'INSERT INTO school_community_posts(id,owner_id,parent_id,kind,author,title,content) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [id, principal.ownerId, data.parentId, data.kind, data.author, data.title, data.content],
      );
      await tx.query('INSERT INTO school_community_events(id,owner_id) VALUES($1,$2)', [
        id,
        principal.ownerId,
      ]);
      await tx.query(
        "DELETE FROM school_community_events WHERE created_at<now()-interval '24 hours'",
      );
      await tx.query('COMMIT');
      return { id };
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
  });
}
export function DELETE(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const result = await (
      await schoolDb()
    ).query('DELETE FROM school_community_posts WHERE id=$1 AND (owner_id=$2 OR $3) RETURNING id', [
      uuid(req.nextUrl.searchParams.get('id')),
      principal.ownerId,
      isSchoolAdmin(principal),
    ]);
    if (!result.rowCount) throw new SchoolError(404, '内容不存在或无权删除');
    return { deleted: true };
  });
}
