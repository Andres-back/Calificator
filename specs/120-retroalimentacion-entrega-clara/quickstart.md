# Guía de validación

## Preparación

- Solo base PostgreSQL sintética aislada, sin credenciales/datos de producción; reutilizar guardas del fixture Spec107 y aplicar la migración nueva allí.
- Matriz: dos profesores y administrador, estudiantes con nota publicada y avisos previos, cero confirmado, provisional, desglose distinto/incompleto, mensaje extenso, ausencia de nota y alumno ajeno.
- Ninguna prueba necesita inferencia ni cambiar modelos.

## Pruebas previstas

1. Unitarias de política/proyección: candidato no publicable → revisión explícita → resumen autorizado; preservar nota/evidencia/feedback original. No incluir preguntas/referencias descartadas en Xali.
2. PostgreSQL/rutas: permisos, request_id repetido, conflicto concurrente, revisión nueva que suspende acceso anterior, cambios de fuente y conservación de snapshot. Migración upgrade/downgrade aislada sin tablas académicas alteradas.
3. Frontend: selección uno/varios/todos y búsqueda, revisión sin perder selección, lotes mixtos y parciales, actualizado/no obsoleto tras confirmar, editor completo y errores recuperables.
4. Presentación: texto corto, no estructurable y de 6.000 caracteres; acentos/saltos y orden conservados, HTML tratado como texto. Función común y paginación sin omisiones.
5. E2E en 360/390/768/1440 px, Chromium/WebKit, ambos temas; impresión Carta/A4 con 30 fichas, continuaciones e identidad. Enlace individual sin datos ajenos; Xali solo contexto autorizado.
6. TypeScript, lint, suites backend/frontend, build, inventario y gobernanza. PR con CI verde antes de solicitar fusión; no afirmar despliegue desde una prueba local.

## Resultados locales (2026-10-23)

- Gate de requisitos: revisión autorizada, 8/8 y lista documental 16/16; Analyze con 10 FR y 4 SC cubiertos por las 17 tareas, sin conflictos constitucionales.
- TDD backend: primera ejecución falló al importar las funciones todavía inexistentes de proyección; tras implementar, 39 pruebas focalizadas pasan. Suite unitaria completa: 1.432 aprobadas y dos skips previos del entorno Windows (WeasyPrint/symlinks).
- PostgreSQL real efímero y sintético: 67 integraciones de retroalimentación aprobadas; incluye permisos, matrícula retirada, solicitudes simultáneas, idempotencia, resumen sin detalle para Xali, conservación de nota/feedback original, vigencia/cupo, migración histórica y upgrade/downgrade de la tabla nueva en esquema temporal.
- Frontend: 140 archivos / 873 pruebas aprobadas con concurrencia limitada a dos. Una ejecución inicial con mucha carga agotó 5 s en un test ajeno de Materias; se repitió aislado sin modificarlo y luego la suite completa quedó verde. Regresiones focalizadas: selección, actualización, lote mixto, revisión/edición, mensaje seguro y 30 fichas.
- TypeScript, lint del módulo y build frontend aprobados; warning de bundle grande preexistente. Ruff F401/F821/F822/F823/F841 aprobado.
- E2E de `frontend/e2e/feedback-delivery.spec.ts`: cuatro anchos, dos temas y Chromium/WebKit (16 variantes). Corrida global: 15 pasaron; la última WebKit 1440 oscuro agotó el tiempo global de un escenario que reúne tres recorridos. Revalidación aislada de esa variante: aprobada (50,7 s), sin saltar comprobaciones de contenido. La traza mostró esperas de automatización por acción; no se atribuye ese tiempo al proveedor IA. Las expectativas individuales conservan su límite. No se certifican dispositivos físicos.
- La captura visual detectó que cambiar a la ruta pública restablecía el tema del fixture: se fijó el tema también allí y se añadió aserción. No es un cambio al tema del producto.
- Impresión A4 y Carta reales: 12 páginas por formato con 30 estudiantes, una devolución deliberadamente muy larga/repetida para probar continuidad. Ambos conservan 12.596 caracteres extraídos, tamaño 12 pt y cero bloques fuera de página; revisión visual de primera, segunda y última página. Se comprueba integridad, no calidad pedagógica de ese texto sintético.
- Optimización de paginación: cada carácter distinto se mide una sola vez por fuente/ejecución; prueba explícita verifica el conteo y la conservación del texto. No se reduce el contenido para hacer pasar una prueba.
- Buscar no dispara nuevas consultas de previsualización (aserción E2E); seleccionar/aprobar/imprimir/crear enlace no invoca IA. No se usaron evidencias reales ni se hicieron inferencias pagadas para este cambio.

Los artefactos sintéticos de navegador/PDF permanecen en `output/playwright/` y `output/pdf/`, ignorados por Git. La gobernanza se comprueba sobre una exportación del índice que excluye los cambios ajenos Spec034/115; el enlace simbólico de desarrollo `Calificator` se excluye solo de esa exportación en Windows.

Cierre: gobernanza 49/49 aprobada en exportación limpia; inventario vigente de 634 superficies; build final aprobado. Selección explícita con teclado (Espacio) aprobada después de la matriz. No hay hooks ni brechas de implementación pendientes según Converge.

CI y fusión/despliegue se registrarán en el PR; los resultados locales no afirman producción. La configuración de generación versión 14 ya fue publicada y comprobada de forma independiente bajo autorización del usuario, no mediante este cambio.
