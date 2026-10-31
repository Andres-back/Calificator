import {
  LayoutDashboard,
  Wrench,
  BookOpen,
  BarChart3,
  Sparkles,
  Settings2,
  Presentation,
  FileText,
  ClipboardCheck,
  UsersRound,
  ShieldCheck,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import type { EducationalIconName } from '@/components/ui';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  brandIcon?: EducationalIconName;
  soon?: boolean;
  permission?: string;
  anyPermission?: readonly string[];
}

export function visibleNavigationItems(items: NavItem[], allowed: ReadonlySet<string>): NavItem[] {
  return items.filter(item => item.anyPermission
    ? item.anyPermission.some(permission => allowed.has(permission))
    : !item.permission || allowed.has(item.permission));
}

export const profesorNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard, brandIcon: 'dashboard' },
  { label: 'Materias', to: '/app/materias', icon: BookOpen, brandIcon: 'subjects', permission: 'subjects.read' },
  { label: 'Pendientes', to: '/app/calificaciones', icon: ClipboardCheck, brandIcon: 'grade-evidence', permission: 'grading.read', anyPermission: ['grading.read', 'grading.grade'] },
  { label: 'Recursos', to: '/app/herramientas', icon: Wrench, brandIcon: 'resources', permission: 'resources.read' },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation, brandIcon: 'presentations', permission: 'presentations.read' },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3, brandIcon: 'reports', permission: 'reports.read' },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles, brandIcon: 'xali', permission: 'xali.use' },
  { label: 'Mi configuración IA', to: '/app/configuracion-ia', icon: Settings2, brandIcon: 'ai-settings', permission: 'ai_settings.personal' },
];

export const adminNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard, brandIcon: 'dashboard' },
  { label: 'Usuarios', to: '/app/admin/usuarios', icon: UsersRound, brandIcon: 'admin-users', permission: 'users.read' },
  { label: 'Roles y permisos', to: '/app/admin/roles', icon: ShieldCheck, brandIcon: 'admin-roles', permission: 'roles.read' },
  { label: 'IA y credenciales', to: '/app/admin/configuracion-ia', icon: Settings2, brandIcon: 'ai-settings', permission: 'admin_ai.manage' },
  { label: 'Correo y recuperación', to: '/app/admin/correo', icon: Mail, brandIcon: 'admin-mail', permission: 'admin_settings.manage' },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation, brandIcon: 'presentations', permission: 'presentations.read' },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3, brandIcon: 'reports', permission: 'reports.read' },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles, brandIcon: 'xali', permission: 'xali.use' },
];

export const estudianteNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard, brandIcon: 'dashboard' },
  { label: 'Mis materias', to: '/app/materias', icon: BookOpen, brandIcon: 'subjects', permission: 'subjects.read' },
  { label: 'Mis actividades', to: '/app/evaluaciones', icon: ClipboardCheck, brandIcon: 'exam', permission: 'evaluations.read' },
  { label: 'Mis resultados', to: '/app/calificaciones/boletin', icon: FileText, brandIcon: 'reports', permission: 'gradebook.read' },
  { label: 'Ayuda con Xali', to: '/app/xali', icon: Sparkles, brandIcon: 'xali', permission: 'xali.use' },
];
