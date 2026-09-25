# Quickstart: validación del flujo estudiante

## Prerrequisitos

- Dependencias frontend instaladas.
- Backend local disponible para la validación manual opcional.
- Tres perfiles de prueba: estudiante estándar, profesor y usuario con rol personalizado.

## Validación automatizada

```powershell
cd frontend
npm run typecheck
npm run lint:strict
npm run test:run -- src/lib/authorization.test.ts src/components/auth/RouteGuards.test.tsx src/modules/materias/MateriaDetailPage.test.tsx src/modules/materias/MateriaEvaluaciones.test.tsx src/modules/presentaciones/PresentacionesPage.test.tsx
npm run build
```

## Escenario 1: estudiante estándar

1. Iniciar sesión con permisos predeterminados completos.
2. Abrir una materia con evaluaciones.
3. Comprobar que solo aparecen Vista general, Evaluaciones, Recursos y Boletín.
4. Comprobar que las tarjetas no muestran `Calificar y revisar`.
5. Abrir directamente `calificar`, `dba`, `criterios` y `/app/herramientas`; todas deben terminar en Acceso denegado.
6. Abrir Presentaciones y comprobar textos de contenido asignado, sin acciones de autoría.

## Escenario 2: profesor

1. Abrir la misma materia.
2. Comprobar que las pestañas docentes permitidas siguen visibles.
3. Confirmar que Calificar y revisar mantiene su destino y acciones.

## Escenario 3: rol personalizado

1. Usar un perfil base estudiante con rol personalizado.
2. Confirmar que solo aparecen los módulos incluidos en sus permisos efectivos.
3. Retirar un permiso y comprobar que la ruta correspondiente queda denegada.

## Validación móvil

Repetir el escenario estudiantil a 360×800 y 390×844. La página no debe tener desbordamiento horizontal; la navegación de materia debe mostrar únicamente las cuatro pestañas compartidas.

## Resultados de validación

- Vitest focalizado: 26 pruebas aprobadas en 5 archivos.
- TypeScript: aprobado sin errores.
- ESLint estricto: aprobado sin advertencias.
- Compilación Vite de producción: aprobada.
- 360×800: Vista general y Evaluaciones muestran únicamente Vista general, Evaluaciones, Recursos y Boletín; ancho del documento 360/360.
- 390×844: Presentaciones usa lenguaje estudiantil y estado vacío asignado; ancho del documento 390/390.
- Las rutas directas `calificar` y `/app/herramientas` terminan en `/app/403` para el estudiante estándar.
