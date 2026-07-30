import {
  LayoutDashboard,
  Wrench,
  BookOpen,
  BarChart3,
  Sparkles,
  Settings2,
  Presentation,
  FileText,
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
];

export const adminNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard },
  { label: 'IA y credenciales', to: '/app/admin/configuracion-ia', icon: Settings2 },
  { label: 'Presentaciones', to: '/app/presentaciones', icon: Presentation },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3 },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles },
];

export const estudianteNav: NavItem[] = [
  { label: 'Inicio', to: '/app', icon: LayoutDashboard },
  { label: 'Mis materias', to: '/app/materias', icon: BookOpen },
  { label: 'Mi boletín', to: '/app/calificaciones/boletin', icon: FileText },
  { label: 'Asistente Xali', to: '/app/xali', icon: Sparkles },
];
