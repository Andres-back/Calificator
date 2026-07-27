import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRole } from '@/components/auth/RequireRole';
import { LoadingScreen } from '@/components/ui';
import { RouterErrorBoundary } from '@/components/RouterErrorBoundary';
import { routes } from '@/config/routes';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const LoginPage = lazy(() => import('@/modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ListPage = lazy(() => import('@/modules/herramientas/ListPage').then((m) => ({ default: m.ListPage })));
const GeneratePage = lazy(() => import('@/modules/herramientas/GeneratePage').then((m) => ({ default: m.GeneratePage })));
const DetailPage = lazy(() => import('@/modules/herramientas/DetailPage').then((m) => ({ default: m.DetailPage })));
const MateriasListPage = lazy(() => import('@/modules/materias/MateriasListPage').then((m) => ({ default: m.MateriasListPage })));
const MateriaDetailPage = lazy(() => import('@/modules/materias/MateriaDetailPage').then((m) => ({ default: m.MateriaDetailPage })));
const MateriaVistaGeneral = lazy(() => import('@/modules/materias/MateriaVistaGeneral').then((m) => ({ default: m.MateriaVistaGeneral })));
const MateriaEvaluaciones = lazy(() => import('@/modules/materias/MateriaEvaluaciones').then((m) => ({ default: m.MateriaEvaluaciones })));
const MateriaCalificar = lazy(() => import('@/modules/materias/MateriaCalificar').then((m) => ({ default: m.MateriaCalificar })));
const MateriaBoletin = lazy(() => import('@/modules/materias/MateriaBoletin').then((m) => ({ default: m.MateriaBoletin })));
const MateriaDbaPage = lazy(() => import('@/modules/materias/MateriaDbaPage').then((m) => ({ default: m.MateriaDbaPage })));
const UnirseMateriaPage = lazy(() => import('@/modules/materias/UnirseMateriaPage').then((m) => ({ default: m.UnirseMateriaPage })));
const EvaluacionesPage = lazy(() => import('@/modules/evaluaciones/EvaluacionesPage').then((m) => ({ default: m.EvaluacionesPage })));
const ResolverEvaluacionPage = lazy(() => import('@/modules/evaluaciones/ResolverEvaluacionPage').then((m) => ({ default: m.ResolverEvaluacionPage })));
const AdminAIConfigPage = lazy(() => import('@/modules/admin/AdminAIConfigPage').then((m) => ({ default: m.AdminAIConfigPage })));
const BoletinPage = lazy(() => import('@/modules/calificaciones/BoletinPage').then((m) => ({ default: m.BoletinPage })));
const CalificacionesWorkspace = lazy(() => import('@/modules/calificaciones/CalificacionesWorkspace').then((m) => ({ default: m.CalificacionesWorkspace })));
const PresentacionesPage = lazy(() => import('@/modules/presentaciones/PresentacionesPage').then((m) => ({ default: m.PresentacionesPage })));
const ReportesPage = lazy(() => import('@/modules/reportes/ReportesPage').then((m) => ({ default: m.ReportesPage })));
const XaliPage = lazy(() => import('@/modules/xali/XaliPage').then((m) => ({ default: m.XaliPage })));
const AnalyticsPage = lazy(() => import('@/modules/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));

const lazyPage = (el: React.ReactNode) => <Suspense fallback={<LoadingScreen />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: routes.login, element: lazyPage(<LoginPage />), errorElement: <RouterErrorBoundary /> },

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
          { path: 'materias', element: lazyPage(<MateriasListPage />) },
          { path: 'materias/unirse', element: lazyPage(<UnirseMateriaPage />) },

          /* Detalle de materia (layout con tabs + <Outlet />) */
          {
            path: 'materias/:id',
            element: lazyPage(<MateriaDetailPage />),
            children: [
              { index: true, element: lazyPage(<MateriaVistaGeneral />) },
              // Todas las rutas compartidas — cada componente interno verifica rol
              { path: 'evaluaciones', element: lazyPage(<MateriaEvaluaciones />) },
              // Solo docente/admin
              {
                element: <RequireRole allow={['profesor', 'admin']} />,
                children: [
                  { path: 'calificar', element: lazyPage(<MateriaCalificar />) },
                  { path: 'dba', element: lazyPage(<MateriaDbaPage />) },
                ],
              },
              // Estudiante ve su boletín propio, profesor ve boletín del grupo
              { path: 'boletin', element: lazyPage(<MateriaBoletin />) },
            ],
          },

          { path: 'evaluaciones', element: lazyPage(<EvaluacionesPage />) },
          { path: 'evaluaciones/:id/resolver', element: lazyPage(<ResolverEvaluacionPage />) },
          { path: 'calificaciones/boletin', element: lazyPage(<BoletinPage />) },
          { path: 'xali', element: lazyPage(<XaliPage />) },

          /* ── Rutas solo admin ── */
          {
            element: <RequireRole allow={['admin']} />,
            children: [
              { path: 'admin/configuracion-ia', element: lazyPage(<AdminAIConfigPage />) },
            ],
          },

          /* ── Rutas solo docente/admin ── */
          {
            element: <RequireRole allow={['profesor', 'admin']} />,
            children: [
              { path: 'herramientas', element: lazyPage(<ListPage />) },
              { path: 'herramientas/nuevo', element: lazyPage(<GeneratePage />) },
              { path: 'herramientas/:id', element: lazyPage(<DetailPage />) },
              // Nuevo workspace de revisión
              { path: 'calificaciones/workspace', element: lazyPage(<CalificacionesWorkspace />) },
              { path: 'calificaciones/workspace/:evaluacionId', element: lazyPage(<CalificacionesWorkspace />) },
              { path: 'analytics', element: lazyPage(<AnalyticsPage />) },
              { path: 'presentaciones', element: lazyPage(<PresentacionesPage />) },
              { path: 'reportes', element: lazyPage(<ReportesPage />) },
            ],
          },

          /* ── Catch-all dentro de /app: 404 ── */
          { path: '*', element: lazyPage(<NotFoundPage />) },
        ],
      },
    ],
  },

  /* ── Redirecciones raíz ── */
  { path: '/', element: <Navigate to={routes.app} replace /> },
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
