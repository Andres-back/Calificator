import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRole } from '@/components/auth/RequireRole';
import { LoadingScreen } from '@/components/ui';

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
const PresentacionesPage = lazy(() => import('@/modules/presentaciones/PresentacionesPage').then((m) => ({ default: m.PresentacionesPage })));
const ReportesPage = lazy(() => import('@/modules/reportes/ReportesPage').then((m) => ({ default: m.ReportesPage })));
const XaliPage = lazy(() => import('@/modules/xali/XaliPage').then((m) => ({ default: m.XaliPage })));

const lazyPage = (el: React.ReactNode) => <Suspense fallback={<LoadingScreen />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: '/login', element: lazyPage(<LoginPage />) },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: lazyPage(<DashboardPage />) },
          // Rutas compartidas (docente, estudiante)
          { path: 'materias', element: lazyPage(<MateriasListPage />) },
          { path: 'materias/unirse', element: lazyPage(<UnirseMateriaPage />) },
          {
            // MateriaDetailPage ahora es un layout con tabs y <Outlet />
            path: 'materias/:id',
            element: lazyPage(<MateriaDetailPage />),
            children: [
              { index: true, element: lazyPage(<MateriaVistaGeneral />) },
              { path: 'evaluaciones', element: lazyPage(<MateriaEvaluaciones />) },
              { path: 'calificar', element: lazyPage(<MateriaCalificar />) },
              { path: 'boletin', element: lazyPage(<MateriaBoletin />) },
              { path: 'dba', element: lazyPage(<MateriaDbaPage />) },
            ],
          },
          { path: 'evaluaciones', element: lazyPage(<EvaluacionesPage />) },
          { path: 'evaluaciones/:id/resolver', element: lazyPage(<ResolverEvaluacionPage />) },
          { path: 'calificaciones/boletin', element: lazyPage(<BoletinPage />) },
          { path: 'xali', element: lazyPage(<XaliPage />) },
          // Rutas solo admin
          {
            element: <RequireRole allow={['admin']} />,
            children: [
              { path: 'admin/configuracion-ia', element: lazyPage(<AdminAIConfigPage />) },
            ],
          },
          // Rutas solo docente/admin — simplificadas
          {
            element: <RequireRole allow={['profesor', 'admin']} />,
            children: [
              { path: 'herramientas', element: lazyPage(<ListPage />) },
              { path: 'herramientas/nuevo', element: lazyPage(<GeneratePage />) },
              { path: 'herramientas/:id', element: lazyPage(<DetailPage />) },
              // Redirigir rutas antiguas de calificaciones → Materias
              { path: 'calificaciones', element: <Navigate to="/app/materias" replace /> },
              { path: 'calificaciones/foto', element: <Navigate to="/app/materias" replace /> },
              { path: 'calificaciones/salon', element: <Navigate to="/app/materias" replace /> },
              { path: 'presentaciones', element: lazyPage(<PresentacionesPage />) },
              { path: 'reportes', element: lazyPage(<ReportesPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '*', element: <Navigate to="/app" replace /> },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
