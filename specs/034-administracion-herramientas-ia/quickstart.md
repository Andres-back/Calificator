# Validación prevista de 034

## Datos controlados

Usar PostgreSQL/Redis locales y proveedores simulados. Administrador con `admin_ai.manage`, docente con y sin credencial personal, estudiante sin acceso administrativo. Herramientas canónicas activas, una pausada, un alias histórico y recursos existentes asignados. Jobs en cola con snapshot anterior y nuevos jobs posteriores a publicación.

No usar credenciales reales ni consumir modelos en pruebas automáticas. La prueba de conexión manual se limita a una solicitud autorizada y se registra separadamente.

## Recorridos de aceptación

1. Abrir el centro y encontrar en máximo tres acciones el modelo efectivo de extracción, valoración, verificación y revisión de calificación.
2. Editar solo una etapa, validar sin tráfico de proveedor, revisar antes/después, publicar y comprobar versión/auditoría.
3. Simular dos administradores: segundo recibe 409 y conserva borrador. Restaurar crea una versión posterior.
4. Comparar docente institucional y docente con API personal permitida sin revelar secretos.
5. Pausar “Cuento”: desaparece/se deshabilita para generar y un POST directo falla; cuento previo sigue visible/descargable/asignable. Reactivar no cambia permisos.
6. Confirmar que “Relacionar pares” aparece una vez y que URL/material histórico `emparejar` sigue funcionando.
7. Job aceptado antes de publicar y su retry usan snapshot anterior; job posterior usa versión nueva.
8. Filtrar uso 7/30/90 días; desconocidos son nulos, etapas condicionales no inventan muestras y duración solapada no se suma.
9. 360×800, 390×844, 768×1024, 1366×768 y 1920×1080 en ambos temas: navegación, búsqueda, diff, confirmación, conflicto y auditoría sin scroll horizontal.

## Pruebas técnicas previstas

Backend focalizado:

```powershell
python -m pytest tests/unit/test_ai_configuration_resolver.py tests/unit/test_admin_ai_usage_service.py tests/unit/test_admin_ai_model_performance.py tests/integration/test_admin_ai_routing.py tests/integration/test_ai_job_configuration_snapshot.py -q
```

Añadir regresiones de catálogo/pausa, permisos, publicación atómica y consumidor por etapa. Ejecutar luego suite backend completa y migración upgrade/downgrade/upgrade sobre base sintética.

Frontend focalizado:

```powershell
npm run typecheck
npm run lint:strict
npx vitest run src/modules/admin src/modules/herramientas
npx playwright test e2e/admin-ai-control-center.spec.ts e2e/resources-creation.spec.ts
```

Cerrar con suites completas, builds Docker, inventario y `git diff --check`. Brave físico se documenta como manual si no puede automatizarse.

## Criterios de cierre

- Cada control editable tiene consumidor comprobado y regresión.
- Configurado/efectivo/observado coinciden o explican la diferencia.
- Ninguna clave aparece en API, logs, capturas o diff.
- Cero cambios retroactivos en jobs, calificaciones o materiales.
- Spec, plan, tasks, analyze, implement y converge completos; CI verde y PR aprobado antes de main.

## Evidencia de validación ejecutada — 2026-09-10

- Migración local PostgreSQL: `upgrade 202609090002 -> 202609100001`, `downgrade 202609100001 -> 202609090002` y nuevo `upgrade` completados; versión final `202609100001`.
- Proyección real del centro sobre PostgreSQL local: 17 etapas agrupadas en 6 funciones y 15 herramientas; 20 ejecuciones estuvieron por debajo de 2 segundos. Muestra registrada: p95 0,20 s (máximo 0,22 s).
- Backend completo: 734 pruebas aprobadas y 3 omitidas por condiciones declaradas; sin fallos.
- Backend focal de configuración/ruteo/snapshots/secretos: 34 pruebas aprobadas.
- Frontend completo: 326 pruebas aprobadas; TypeScript, lint estricto y build de producción aprobados.
- E2E focal: centro administrativo validado en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, en modo claro y oscuro; creación de recursos, alias histórico y herramienta pausada aprobados (8 recorridos).
- Inventario contractual: 536 superficies vigentes; `git diff --check` sin errores.

Las pruebas no enviaron solicitudes a proveedores de IA ni usaron credenciales reales. Los avisos restantes son deprecaciones de dependencias y no afectan la aceptación de esta funcionalidad.

## Resultado de convergencia

La comparación final entre `spec.md`, `plan.md`, contratos y código encontró y cerró tres brechas antes del PR: credenciales ausentes ahora bloquean la publicación, el resumen muestra cambios antes/después y las métricas separan fallos, ejecución, cola y revisión humana. No quedaron tareas funcionales nuevas; solo resta la promoción por PR y la comprobación de lectura posterior al despliegue.
