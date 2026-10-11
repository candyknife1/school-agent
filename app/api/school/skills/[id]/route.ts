import type { NextRequest } from 'next/server';
import { getSkillSource } from '@/lib/school/skill-source';
import { schoolRoute } from '@/lib/school/http';
import { SchoolError } from '@/lib/school/contracts';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return schoolRoute(req, async () => {
    const { id } = await context.params;
    const source = getSkillSource(id);
    if (!source) throw new SchoolError(404, '技能不存在');
    return source;
  });
}
