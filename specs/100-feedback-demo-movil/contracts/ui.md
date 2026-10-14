# Contratos de interfaz

## Retroalimentación (FR-001, FR-002, FR-009, FR-010)

Conservar nombre, navegación y permisos. Lectura íntegra con ancho disponible/scroll de página. Editar solo con permiso, editor creciente controlado por borrador actual. Operación de guardado existente; error conserva cambios. Cancelar borrador exige confirmación y no descarta otros ajustes.

## Nota y puntajes (FR-003, FR-004, FR-005, FR-010)

Etiquetas: «Nota sugerida por la IA», «Nota confirmada», «Cálculo provisional» o «Cálculo pendiente de revisión», según fuente/estado. Pendientes por null, no cero; distinguir preguntas/criterios. No «Nota final» para cálculo pendiente ni atribuir diferencia a docente sin decisión.

Editor: 0.0000 → 0; 0.7000 → 0.7; 0.6250 → 0.625. Apertura no dispara dirty; texto transitorio intacto por tecla. Máximo mostrado y validado exacto. Formato no cambia payload/fórmula; guardar conserva motivo, explicación y versiones.

## Añadir al inicio (FR-006, FR-007, FR-008, FR-009, FR-010)

- Inicio, secundario en acceso, menú de cuenta de profesor/estudiante/admin. Sin nuevas capacidades académicas.
- Botón «Añadir al inicio»; ayuda «Un acceso directo a XCalificator. Requiere internet».
- Guía manual con variantes seleccionables Android/iPhone, sin evento/prompt automático. Cerrar no cambia sesión ni datos.
- iPhone Safari/Compartir/Agregar a inicio; Android menú/Agregar a pantalla principal o Instalar app si aparece; navegador integrado abrir en navegador del teléfono; computador continuar en celular.
- Guía accesible: título, cierre/Escape, foco/retorno; no desmontar al cerrar menú de cuenta. Sin desbordamiento ni colisión con teclado.
- Ocultar en standalone; consultar instrucciones no prueba instalación.
- Sin APK, store, service worker, offline, tracking, autologin, cambios de start_url o CSP.

## Interfaces conservadas

Sin contratos HTTP/schema/proveedor nuevos. Guardar/confirmar mantienen acciones autorizadas actuales; consultar/instalar no las ejecutan.
