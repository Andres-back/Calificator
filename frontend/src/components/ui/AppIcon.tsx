import {
  LayoutDashboard,
  BookOpen,
  UserPlus,
  ClipboardCheck,
  Send,
  GraduationCap,
  Camera,
  UsersRound,
  FileText,
  Bot,
  Sparkles,
  Wrench,
  Presentation,
  CircleUser,
  BarChart3,
  Settings,
  FilePen,
  BookOpenCheck,
  PenLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Lock,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Mapa canónico de iconografía de XCalificator. Un nombre semántico por módulo
 * o estado para mantener consistencia visual en toda la app. Usa Lucide (ya
 * presente en el proyecto); no cambia navegación ni lógica.
 */
export type AppIconName =
  | 'dashboard'
  | 'subjects'
  | 'joinSubject'
  | 'evaluations'
  | 'resolve'
  | 'grades'
  | 'photoGrade'
  | 'classroom'
  | 'bulletin'
  | 'xaliStudent'
  | 'xaliTeacher'
  | 'tools'
  | 'presentations'
  | 'profile'
  | 'reports'
  | 'settings'
  | 'draft'
  | 'published'
  | 'grading'
  | 'confirmed'
  | 'adjusted'
  | 'pending'
  | 'success'
  | 'warning'
  | 'error'
  | 'locked'
  | 'secure';

const ICONS: Record<AppIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  subjects: BookOpen,
  joinSubject: UserPlus,
  evaluations: ClipboardCheck,
  resolve: Send,
  grades: GraduationCap,
  photoGrade: Camera,
  classroom: UsersRound,
  bulletin: FileText,
  xaliStudent: Bot,
  xaliTeacher: Sparkles,
  tools: Wrench,
  presentations: Presentation,
  profile: CircleUser,
  reports: BarChart3,
  settings: Settings,
  // Estados
  draft: FilePen,
  published: BookOpenCheck,
  grading: PenLine,
  confirmed: CheckCircle2,
  adjusted: PenLine,
  pending: Clock,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  locked: Lock,
  secure: ShieldCheck,
};

export function AppIcon({ name, className }: { name: AppIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={cn('h-5 w-5', className)} />;
}
