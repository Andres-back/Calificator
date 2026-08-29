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
}

export const profesorNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard, brandIcon: 'dashboard' },
  { label: 'Materias', to: '/app/materias', icon: BookOpen, brandIcon: 'subjects' },
  { label: 'Recursos', to: '/app/herramientas', icon: Wrench, brandIcon: 'resources' },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation, brandIcon: 'presentations' },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3, brandIcon: 'reports' },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles, brandIcon: 'xali' },
  { label: 'Mi configuración IA', to: '/app/configuracion-ia', icon: Settings2, brandIcon: 'ai-settings' },
];

export const adminNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard },
  { label: 'Usuarios y roles', to: '/app/admin/usuarios', icon: UsersRound },
  { label: 'IA y credenciales', to: '/app/admin/configuracion-ia', icon: Settings2, brandIcon: 'ai-settings' },
  { label: 'Correo y recuperación', to: '/app/admin/correo', icon: Mail },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation, brandIcon: 'presentations' },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3, brandIcon: 'reports' },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles, brandIcon: 'xali' },
];

export const estudianteNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard, brandIcon: 'dashboard' },
  { label: 'Mis materias', to: '/app/materias', icon: BookOpen, brandIcon: 'subjects' },
  { label: 'Mis actividades', to: '/app/evaluaciones', icon: ClipboardCheck, brandIcon: 'exam' },
  { label: 'Mis resultados', to: '/app/calificaciones/boletin', icon: FileText, brandIcon: 'reports' },
  { label: 'Ayuda con Xali', to: '/app/xali', icon: Sparkles, brandIcon: 'xali' },
];
