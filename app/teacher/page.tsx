import type { Metadata } from 'next';
import { TeacherPortal } from '@/components/school/teacher-portal';
export const metadata: Metadata = {
  title: 'school-agent · 教师工作台',
  description: '小学教学技能广场、知识库与真实使用数据看板',
};
export default function TeacherPage() {
  return <TeacherPortal />;
}
