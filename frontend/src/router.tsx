import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { LoadingScreen } from '@/components/ui';
import { RouterErrorBoundary } from '@/components/RouterErrorBoundary';
import { routes } from '@/config/routes';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const LandingPage = lazy(() => import('@/modules/auth/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/modules/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const RequestPasswordResetPage = lazy(() => import('@/modules/auth/RequestPasswordResetPage').then((m) => ({ default: m.RequestPasswordResetPage })));
const ResetPasswordPage = lazy(() => import('@/modules/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ListPage = lazy(() => import('@/modules/herramientas/ListPage').then((m) => ({ default: m.ListPage })));
const GeneratePage = lazy(() => import('@/modules/herramientas/GeneratePage').then((m) => ({ default: m.GeneratePage })));
const DetailPage = lazy(() => import('@/modules/herramientas/DetailPage').then((m) => ({ default: m.DetailPage })));
const StudentResourcePage = lazy(() => import('@/modules/herramientas/StudentResourcePage').then((m) => ({ default: m.StudentResourcePage })));
const MateriasListPage = lazy(() => import('@/modules/materias/MateriasListPage').then((m) => ({ default: m.MateriasListPage })));
const MateriaDetailPage = lazy(() => import('@/modules/materias/MateriaDetailPage').then((m) => ({ default: m.MateriaDetailPage })));
const MateriaVistaGeneral = lazy(() => import('@/modules/materias/MateriaVistaGeneral').then((m) => ({ default: m.MateriaVistaGeneral })));
const MateriaEvaluaciones = lazy(() => import('@/modules/materias/MateriaEvaluaciones').then((m) => ({ default: m.MateriaEvaluaciones })));
const MateriaRecursos = lazy(() => import('@/modules/materias/MateriaRecursos').then((m) => ({ default: m.MateriaRecursos })));
const MateriaCalificar = lazy(() => import('@/modules/materias/MateriaCalificar').then((m) => ({ default: m.MateriaCalificar })));
const MateriaAsistencia = lazy(() => import('@/modules/materias/MateriaAsistencia').then((m) => ({ default: m.MateriaAsistencia })));
const MateriaBoletin = lazy(() => import('@/modules/materias/MateriaBoletin').then((m) => ({ default: m.MateriaBoletin })));
const MateriaDbaPage = lazy(() => import('@/modules/materias/MateriaDbaPage').then((m) => ({ default: m.MateriaDbaPage })));
const UnirseMateriaPage = lazy(() => import('@/modules/materias/UnirseMateriaPage').then((m) => ({ default: m.UnirseMateriaPage })));
const EvaluacionesPage = lazy(() => import('@/modules/evaluaciones/EvaluacionesPage').then((m) => ({ default: m.EvaluacionesPage })));
const ResolverEvaluacionPage = lazy(() => import('@/modules/evaluaciones/ResolverEvaluacionPage').then((m) => ({ default: m.ResolverEvaluacionPage })));
const TeacherAIConfigPage = lazy(() => import('@/modules/profesor_ai/TeacherAIConfigPage').then((m) => ({ default: m.TeacherAIConfigPage })));
const AdminUsersPage = lazy(() => import('@/modules/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminRolesPage = lazy(() => import('@/modules/admin/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })));
const AdminAIConfigPage = lazy(() => import('@/modules/admin/AdminAIConfigPage').then((m) => ({ default: m.AdminAIConfigPage })));
const AdminMailConfigPage = lazy(() => import('@/modules/admin/AdminMailConfigPage').then((m) => ({ default: m.AdminMailConfigPage })));
const BoletinPage = lazy(() => import('@/modules/calificaciones/BoletinPage').then((m) => ({ default: m.BoletinPage })));
const CalificacionesWorkspace = lazy(() => import('@/modules/calificaciones/CalificacionesWorkspace').then((m) => ({ default: m.CalificacionesWorkspace })));
const PresentacionesPage = lazy(() => import('@/modules/presentaciones/PresentacionesPage').then((m) => ({ default: m.PresentacionesPage })));
const ReportesPage = lazy(() => import('@/modules/reportes/ReportesPage').then((m) => ({ default: m.ReportesPage })));
const XaliPage = lazy(() => import('@/modules/xali/XaliPage').then((m) => ({ default: m.XaliPage })));
const AnalyticsPage = lazy(() => import('@/modules/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));

const lazyPage = (el: React.ReactNode) => <Suspense fallback={<LoadingScreen />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: routes.home, element: lazyPage(<LandingPage />), errorElement: <RouterErrorBoundary /> },
  { path: routes.login, element: lazyPage(<LoginPage />), errorElement: <RouterErrorBoundary /> },
  { path: routes.register, element: lazyPage(<RegisterPage />), errorElement: <RouterErrorBoundary /> },
  { path: routes.requestPasswordReset, element: lazyPage(<RequestPasswordResetPage />), errorElement: <RouterErrorBoundary /> },
  { path: routes.resetPassword, element: lazyPage(<ResetPasswordPage />), errorElement: <RouterErrorBoundary /> },

  /* ── Páginas de error fuera del AppShell ── */
  { path: routes.notFound, element: lazyPage(<NotFoundPage />) },

  /* ── App protegida ── */
  {
    element: <RequireAuth />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        path: routes.app,
        element: <AppShell />,
        errorElement: <RouterErrorBoundary />,
        children: [
          { index: true, element: lazyPage(<DashboardPage />) },

          /* ── Página 403 dentro del shell ── */
          { path: '403', element: lazyPage(<ForbiddenPage />) },
          { path: '404', element: lazyPage(<NotFoundPage />) },

          /* ── Rutas compartidas (profesor + estudiante + admin cuando aplique) ── */
          { element: <RequirePermission anyOf={['subjects.read']} />, children: [{ path: 'materias', element: lazyPage(<MateriasListPage />) }] },
          { element: <RequirePermission anyOf={['subjects.enroll']} />, children: [{ path: 'materias/unirse', element: lazyPage(<UnirseMateriaPage />) }] },
          { element: <RequirePermission anyOf={['evaluations.submit']} />, children: [{ path: 'evaluaciones/:id/resolver', element: lazyPage(<ResolverEvaluacionPage />) }] },
          { element: <RequirePermission anyOf={['gradebook.read']} />, children: [{ path: 'calificaciones/boletin', element: lazyPage(<BoletinPage />) }] },
          { element: <RequirePermission anyOf={['resources.read']} />, children: [{ path: 'recursos/:id', element: lazyPage(<StudentResourcePage />) }] },

          /* Detalle de materia (layout con tabs + <Outlet />) */
          { element: <RequirePermission anyOf={['subjects.read']} />, children: [{
            path: 'materias/:id', element: lazyPage(<MateriaDetailPage />), children: [
              { index: true, element: lazyPage(<MateriaVistaGeneral />) },
              { element: <RequirePermission anyOf={['evaluations.read']} />, children: [{ path: 'evaluaciones', element: lazyPage(<MateriaEvaluaciones />) }] },
              { element: <RequirePermission anyOf={['resources.read']} />, children: [{ path: 'recursos', element: lazyPage(<MateriaRecursos />) }] },
              // Solo docente/admin
              { element: <RequirePermission anyOf={['grading.read', 'grading.grade']} />, children: [{ path: 'calificar', element: lazyPage(<MateriaCalificar />) }] },
              { element: <RequirePermission anyOf={['attendance.read', 'attendance.manage']} />, children: [{ path: 'asistencia', element: lazyPage(<MateriaAsistencia />) }] },
              { element: <RequirePermission anyOf={['dba.read', 'dba.manage']} />, children: [{ path: 'dba', element: lazyPage(<MateriaDbaPage />) }] },
              // Estudiante ve su boletín propio, profesor ve boletín del grupo
              { element: <RequirePermission anyOf={['gradebook.read']} />, children: [{ path: 'boletin', element: lazyPage(<MateriaBoletin />) }] },
            ],
          }] },

          { element: <RequirePermission anyOf={['evaluations.read']} />, children: [{ path: 'evaluaciones', element: lazyPage(<EvaluacionesPage />) }] },
          { element: <RequirePermission anyOf={['xali.use']} />, children: [{ path: 'xali', element: lazyPage(<XaliPage />) }] },

          /* ── Rutas solo admin ── */
          { element: <RequirePermission anyOf={['admin_ai.manage']} />, children: [{ path: 'admin/configuracion-ia', element: lazyPage(<AdminAIConfigPage />) }] },
          { element: <RequirePermission anyOf={['users.read']} />, children: [{ path: 'admin/usuarios', element: lazyPage(<AdminUsersPage />) }] },
          { element: <RequirePermission anyOf={['roles.read']} />, children: [{ path: 'admin/roles', element: lazyPage(<AdminRolesPage />) }] },
          { element: <RequirePermission anyOf={['admin_settings.manage']} />, children: [{ path: 'admin/correo', element: lazyPage(<AdminMailConfigPage />) }] },

          /* ── Rutas solo docente/admin ── */
          { element: <RequirePermission anyOf={['ai_settings.personal']} />, children: [{ path: 'configuracion-ia', element: lazyPage(<TeacherAIConfigPage />) }] },
          { element: <RequirePermission anyOf={['resources.read']} />, children: [{ path: 'herramientas', element: lazyPage(<ListPage />) }, { path: 'herramientas/:id', element: lazyPage(<DetailPage />) }] },
          { element: <RequirePermission anyOf={['resources.create']} />, children: [{ path: 'herramientas/nuevo', element: lazyPage(<GeneratePage />) }] },
          { element: <RequirePermission anyOf={['grading.grade']} />, children: [{ path: 'calificaciones/foto', element: <Navigate to={routes.materiasPara('calificar')} replace /> }] },
          { element: <RequirePermission anyOf={['grading.read', 'grading.grade']} />, children: [{ path: 'calificaciones/workspace', element: lazyPage(<CalificacionesWorkspace />) }, { path: 'calificaciones/workspace/:evaluacionId', element: lazyPage(<CalificacionesWorkspace />) }] },
          { element: <RequirePermission anyOf={['reports.read']} />, children: [{ path: 'analytics', element: lazyPage(<AnalyticsPage />) }, { path: 'reportes', element: lazyPage(<ReportesPage />) }] },
          { element: <RequirePermission anyOf={['presentations.read']} />, children: [{ path: 'presentaciones', element: lazyPage(<PresentacionesPage />) }] },

          /* ── Catch-all dentro de /app: 404 ── */
          { path: '*', element: lazyPage(<NotFoundPage />) },
        ],
      },
    ],
  },

  { path: '*', element: lazyPage(<NotFoundPage />) },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
