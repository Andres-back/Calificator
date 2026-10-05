# Verificación de visualización y Word

## Precondiciones

Alcance y plan aprobados por el usuario antes de implementar. Usar datos
sintéticos con docente dueño, docente ajeno y estudiante. No usar datos personales
en snapshots o documentos de prueba. Dependencias existentes instaladas.

## Verificación focalizada prevista

1. Abrir una evaluación propia desde materia y lista docente: «Visualizar» muestra
   documento sin entrar al wizard. Confirmar título/preguntas/opciones/puntajes.
2. Descargar PDF y Word; abrir DOCX, validar párrafos editables, tildes/texto largo,
   numeración y todos los puntos. Extraer texto y compararlo con el registro.
3. Seleccionar solucionario: respuestas guardadas por número visibles solo en esa
   versión. Pruebas negativas de acceso directo y ausencia de respuestas en versión estudiante.
4. Verificar antes/después contenido y estado de evaluación, entregas/notas sin cambios.
5. Origen lectura/taller/examen: conservar contexto y preguntas. Tipos Word no
   soportados: error explicativo sin archivo incompleto, con PDF aún disponible.
6. Simular sesión vencida, error de red y contenido vacío; comprobar reintento,
   mensajes y navegación. Cambiar versión/cerrar no deja URLs temporales vivas.
7. Playwright 360×800, 390×844 y escritorio: sin overflow ni botones tapados;
   abrir/cerrar/descargar en claro/oscuro y verificar fallback del visor móvil.

## Comandos de referencia

Desde backend: `python -m pytest tests/unit/test_evaluation_exports.py` (test nuevo
planeado) y regresiones de ciclo de vida/materiales. Ruff en archivos afectados.
Desde frontend: `npm run typecheck`, `npm run lint`, pruebas Vitest focalizadas,
E2E responsive correspondiente y `npm run build`, usando scripts reales del proyecto.
Desde raíz: pruebas de gobernanza e inventario; `git diff --check`.
Rutas y comandos finales se ajustarán a los scripts existentes al implementar.

## Resultados ejecutados (2026-10-04)

- Backend, nueva suite: **31 pasan / 1 omitida localmente**. Contratos PDF/DOCX,
  acceso/rol/propiedad, versión estudiante, números string/int, claves antiguas,
  opciones y puntajes, materiales originales, gráficos no soportados y no mutación.
- Regresiones de ciclo de vida, conversiones, adaptadores y autorización junto con
  exportaciones: **134 pasan / 1 omitida** antes de añadir los dos casos finales
  de origen material (estos dos pasan en la suite focalizada anterior).
- Frontend: **18 pruebas pasan** (preview, API de blobs y lista de materia).
- Playwright: **4 pruebas pasan**, 360×800 claro, 390×844 oscuro y 1366×768;
  descarga PDF/Word, selector de solucionario, cierre, permiso solo lectura,
  vista estudiante sin controles docentes, geometría sin desbordamiento/solapamiento.
  Mocks controlados; no sustituye una prueba física en Safari/iPhone.
- TypeScript (`npm run build`), lint estricto, build Vite, auditoría de acciones
  y presupuesto de recursos pasan; Ruff focalizado pasa. Se mantiene advertencia
  existente del chunk principal >500 kB, sin alterar dependencias.
- Checklist de requisitos: 16 completos, 0 pendientes antes de implementación.

### Documentos reales y límites

- Dos muestras sintéticas (examen/solucionario) se renderizaron con el WeasyPrint
  existente en el contenedor productivo mediante cálculo en memoria, **sin consultar
  base de datos, usar IA, escribir archivos remotos ni modificar configuración**.
  PDF real de una página: 15 348/16 216 bytes. Texto extraído coincide con preguntas
  y respuestas según versión. Ambas páginas PNG fueron inspeccionadas: sin recortes,
  opciones/puntajes completos, espacios de respuesta y solucionario separado.
- Muestras DOCX generadas y abiertas estructuralmente con python-docx: párrafos
  nativos editables, no capturas; pruebas comparan texto/opciones/puntajes y privacidad.
  `render_docx.py` se intentó con el Python empaquetado y falló porque LibreOffice
  `soffice.exe` no está disponible. **La paginación visual de Word no fue verificada**;
  no se instaló ni usó software de escritorio del usuario como sustituto.
- Docker Desktop local sigue sin motor Linux disponible; el test PDF real se omite
  solo en Python local sin WeasyPrint. En CI backend con dependencias completas se
  ejecuta; el render real sintético anterior compensa la falta de runtime PDF local,
  no la limitación visual de Word. Builds de contenedores y pruebas completas en CI
  son requisito anterior al merge.
- Word admite examen, quiz rápido, taller, ficha y lectura comprensiva. Conserva
  lectura/fuente, preguntas y claves; fórmulas como texto editable. Crucigramas,
  sopas/mapas y evaluaciones con gráficos se rechazan con 422 y recomendación PDF,
  sin omitir contenido para entregar un archivo aparentemente completo.
- Evidencia local no versionada: `frontend/test-results/*/evaluation-preview.png`
  y `frontend/test-results/document-qa/`. Solo datos sintéticos; sin datos de alumnos.

### Coherencia y convergencia

Los 8 FR, 4 SC, 3 historias y 5 decisiones del plan tienen implementación y pruebas.
Se verificaron los 8 principios constitucionales; no hay brechas funcionales del
alcance aprobado. Limitación de render visual Word y validación física iPhone
registradas arriba, sin afirmar pruebas no ejecutadas. No hay hooks de extensiones.
Propiedad técnica única: módulo 005; evolución 081 y nuevo endpoint DOCX en el
inventario regenerado. Puertas PR/CI/entrega productiva siguen pendientes.

## Entrega

Todos los controles aplicables en verde antes de fusionar. La comprobación posterior
a un despliegue autorizado usa lectura y exportaciones de evaluación demo existente,
sin crear, publicar o modificar registros. Registrar evidencia y límites de Word
en issue #169; no declarar despliegue o pruebas antes de ejecutarlos.
