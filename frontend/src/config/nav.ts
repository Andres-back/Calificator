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

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  soon?: boolean;
}

export const profesorNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard },
  { label: 'Materias', to: '/app/materias', icon: BookOpen },
  { label: 'Recursos', to: '/app/herramientas', icon: Wrench },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3 },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles },
  { label: 'Mi configuración IA', to: '/app/configuracion-ia', icon: Settings2 },
];

export const adminNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard },
  { label: 'Usuarios y roles', to: '/app/admin/usuarios', icon: UsersRound },
  { label: 'IA y credenciales', to: '/app/admin/configuracion-ia', icon: Settings2 },
  { label: 'Correo y recuperación', to: '/app/admin/correo', icon: Mail },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3 },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles },
];

export const estudianteNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard },
  { label: 'Mis materias', to: '/app/materias', icon: BookOpen },
  { label: 'Mis actividades', to: '/app/evaluaciones', icon: ClipboardCheck },
  { label: 'Mis resultados', to: '/app/calificaciones/boletin', icon: FileText },
  { label: 'Ayuda con Xali', to: '/app/xali', icon: Sparkles },
];
