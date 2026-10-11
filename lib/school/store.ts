import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';
import type { OwnerPrincipal } from '@/lib/server/identity/types';
import { SchoolError } from './contracts';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS school_knowledge (
 id uuid PRIMARY KEY, owner_id text NOT NULL, title text NOT NULL,
 category text NOT NULL, subject text NOT NULL, content text NOT NULL,
 visibility text NOT NULL CHECK (visibility IN ('private','submitted','school')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_knowledge_owner ON school_knowledge(owner_id);
CREATE TABLE IF NOT EXISTS school_teacher_usage (
 owner_id text NOT NULL, request_id uuid NOT NULL, thread_id uuid NOT NULL,
 fingerprint text NOT NULL, skill_id text, category text NOT NULL, subject text NOT NULL,
 status text NOT NULL CHECK (status IN ('running','succeeded','failed')),
 latency_ms integer, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0,
 resource_ids uuid[] NOT NULL DEFAULT '{}', rating smallint CHECK (rating IN (-1,1)),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id, request_id)
);
CREATE INDEX IF NOT EXISTS school_teacher_usage_date ON school_teacher_usage(created_at, owner_id);
CREATE TABLE IF NOT EXISTS school_teacher_turns (
 owner_id text NOT NULL, request_id uuid NOT NULL, thread_id uuid NOT NULL,
 message text NOT NULL, answer text, citations jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id, request_id),
 FOREIGN KEY(owner_id,request_id) REFERENCES school_teacher_usage(owner_id,request_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS school_teacher_turns_thread ON school_teacher_turns(owner_id,thread_id,created_at);
`;
const EXTENSIONS = `
CREATE TABLE IF NOT EXISTS school_chat_attachments (
 id uuid PRIMARY KEY, owner_id text NOT NULL, thread_id uuid NOT NULL,
 title text NOT NULL, content text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'parsing',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_attachment_owner ON school_chat_attachments(owner_id,thread_id);
CREATE TABLE IF NOT EXISTS school_community_posts (
 id uuid PRIMARY KEY, owner_id text NOT NULL, parent_id uuid REFERENCES school_community_posts(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('discussion','notice','reply')),
 author text NOT NULL, title text NOT NULL, content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_community_date ON school_community_posts(created_at);
CREATE TABLE IF NOT EXISTS school_community_events (
 id uuid PRIMARY KEY, owner_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS school_community_events_owner ON school_community_events(owner_id,created_at);
`;
const ready = new WeakMap<Pool, Promise<void>>();
export async function schoolDb(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new SchoolError(503, '请先配置 PostgreSQL 数据库');
  const { pool } = await getServerPersistenceProvider(connectionString);
  if (!ready.has(pool)) {
    const bootstrap = (async () => {
      const tx = await pool.connect();
      try {
        await tx.query('BEGIN');
        await tx.query("SELECT pg_advisory_xact_lock(hashtext('school-agent.teacher.schema'))");
        await tx.query(
          'CREATE TABLE IF NOT EXISTS school_teacher_migrations(version integer PRIMARY KEY, checksum text NOT NULL)',
        );
        const migrations = [SCHEMA, EXTENSIONS];
        const applied = await tx.query<{ version: number; checksum: string }>(
          'SELECT version, checksum FROM school_teacher_migrations ORDER BY version',
        );
        for (const row of applied.rows) {
          const migration = migrations[row.version - 1];
          if (!migration || row.checksum !== createHash('sha256').update(migration).digest('hex'))
            throw new SchoolError(503, '教师模块数据库版本不匹配，请检查迁移');
        }
        for (const [index, migration] of migrations.entries()) {
          if (applied.rows.some((row) => row.version === index + 1)) continue;
          await tx.query(migration);
          await tx.query('INSERT INTO school_teacher_migrations(version,checksum) VALUES($1,$2)', [
            index + 1,
            createHash('sha256').update(migration).digest('hex'),
          ]);
        }
        await tx.query('COMMIT');
      } catch (error) {
        await tx.query('ROLLBACK');
        throw error;
      } finally {
        tx.release();
      }
    })();
    ready.set(pool, bootstrap);
    bootstrap.catch(() => ready.delete(pool));
  }
  await ready.get(pool);
  return pool;
}
/** An unsigned anonymous cookie must never grant school-wide administration. */
export function isSchoolAdmin(principal: OwnerPrincipal): boolean {
  return principal.assurance === 'verified' && principal.roles.has('admin');
}
export async function accessibleResources(pool: Pool, principal: OwnerPrincipal, ids: string[]) {
  const result = await pool.query<{ id: string; title: string; content: string }>(
    `SELECT id,title,content FROM school_knowledge WHERE id=ANY($1::uuid[]) AND
    (owner_id=$2 OR visibility='school' OR ($3 AND visibility='submitted'))`,
    [ids, principal.ownerId, isSchoolAdmin(principal)],
  );
  if (result.rows.length !== ids.length)
    throw new SchoolError(404, '引用资料不存在或无权访问，请重新选择');
  return ids.map((id) => result.rows.find((r) => r.id === id)!);
}
