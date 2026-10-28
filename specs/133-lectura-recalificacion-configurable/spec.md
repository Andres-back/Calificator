# Hotfix: lectura configurable y referencia anterior al recalificar

**Branch**: `codex/133-lectura-recalificacion-configurable`
**Created**: 2026-10-28
**Status**: Alcance aprobado directamente; hotfix abreviado
**Issue**: [#279](https://github.com/Andres-back/Calificator/issues/279)
**Input**: «sí corrige, debe quedar todo configurable desde panel admin».

## User Scenarios & Testing

### US1 — Administrar la lectura efectiva (P1)

El administrador selecciona el proveedor, modelo, respaldo y límites de lectura de evidencias. Lo guardado es lo que reciben los trabajos nuevos, sin una lista adicional de modelos oculta en el servidor.

**Independent Test**: publicar dos modelos ficticios comprobados y límites; un trabajo nuevo captura esa selección y, ante fallo, no consulta un tercero. Un trabajo ya admitido conserva su selección anterior.

**Acceptance Scenarios**:

1. Dada una ruta comprobada, al publicar desde administración solo se usan principal y respaldo elegidos, con sus propias credenciales.
2. Dado un principal fallido, se respeta el presupuesto total de intentos y la alternativa explícita. Sin respaldo no aparece otro proveedor por omisión.
3. Dada una configuración ausente/inválida, se informa el problema y no se intenta un modelo retirado.
4. Dados dos administradores, una publicación desactualizada se rechaza sin sobreescribir. Un cliente anterior que omite los límites los conserva.

### US2 — Lectura acotada y comprensible (P1)

El profesor recibe éxito, revisión o error claro sin esperas acumuladas por modelos no seleccionados. La lectura incompleta no se convierte en una calificación inventada.

**Independent Test**: proveedores simulados con timeout, rechazo, respuesta cortada y varias hojas. Verificar límites, estados y diagnósticos sin exponer contenido.

**Acceptance Scenarios**:

1. Un intento de lectura no supera el límite elegido; con principal y respaldo no hay más de dos intentos por página.
2. Una salida cortada se identifica como tal, conserva incertidumbre y no se acepta como resultado completo.
3. Una entrega con hojas pendientes no recibe una nota automática que ignore esas hojas.

### US3 — Consultar la nota previa sin confundirla con la nueva (P1)

Al recalificar, el docente conserva una referencia visible al resultado anterior aunque el trabajo falle. Esa referencia no restaura, confirma, exporta ni publica una nota.

**Independent Test**: historial privado con varios intentos vacíos y una nota anterior, incluido cero; mostrarla solo al docente autorizado.

**Acceptance Scenarios**:

1. Si la recalificación falla o continúa y no existe nota nueva, se muestra la última nota histórica disponible con etiqueta de referencia.
2. Cero es una nota histórica válida. Sin historial, error al consultarlo o nota inválida, no se inventa ningún valor.
3. Estudiantes y enlaces públicos no reciben una proyección nueva del historial privado. Las acciones de publicación siguen usando solo el resultado vigente.

## Requirements

- **FR-001**: La lectura de evidencias DEBE usar solo la ruta administrativa capturada: principal y respaldo explícito, sin cadenas de modelos del entorno ni sustituciones silenciosas cuando falle la configuración.
- **FR-002**: Cada selección DEBE usar su conexión y origen de credencial correctos; debe poder cambiarse a cualquier API compatible y modelo visual comprobado sin modificar la lógica de negocio.
- **FR-003**: El administrador DEBE poder guardar, reabrir y versionar desde el panel el tiempo por intento, intentos totales y límite de salida de esta lectura. Los clientes anteriores que omitan estos campos deben conservarlos.
- **FR-004**: Los controles DEBEN aceptar entre5 y60 segundos, entre1 y2 intentos totales por página y entre1024 y10000 tokens de salida. Valores iniciales60/2/10000; el respaldo consume el mismo presupuesto, no uno adicional. Con respaldo se prioriza probarlo tras el fallo del principal; sin él solo se repiten fallos transitorios.
- **FR-005**: Una lectura incompleta o cortada DEBE quedar identificada de forma segura y sin nota automática incompleta; diagnósticos conservan etapa/modelo/código/tiempos/uso disponibles sin nombres, respuestas ni claves.
- **FR-006**: Si no hay nota nueva tras una recalificación, el docente DEBE poder ver como referencia la última nota histórica válida, incluido cero, sin restaurar, confirmar o publicar automáticamente.
- **FR-007**: Se DEBEN conservar permisos, historia, evidencias, decisión docente, idempotencia y aislamiento del historial; no añadir consultas de historial para estudiantes o enlaces públicos.
- **FR-008**: La evolución de controles DEBE ser aditiva y compatible con configuraciones y trabajos previos; no reescribir snapshots académicos ni reintentar trabajos reales automáticamente.
- **FR-009**: La selección operativa aprobada es Luna principal y GLM respaldo para lectura de evidencias, como dato administrativo publicable tras integrar el consumidor, sin cambiar evaluadores, listas, imágenes, embeddings u otras rutas.
- **FR-010**: El cambio DEBE entregarse mediante hotfix, pruebas y CI con controles completos; sin fusión, despliegue manual, llamadas con evidencias reales ni restauración de notas de producción bajo esta autorización.

### Key Entities

- Ruta de lectura: selección de principal/respaldo y controles versionados del administrador.
- Trabajo admitido: referencia inmutable a la selección y presupuesto capturados.
- Referencia histórica: nota previa de un cambio docente autorizado; nunca una nueva nota vigente.

## Success Criteria

- **SC-001**: Todas las matrices de configuración, fallos y respaldo consultan exclusivamente las selecciones esperadas y respetan el presupuesto; cero consultas al tercer proveedor de prueba.
- **SC-002**: Timeout, salida cortada y configuración inválida se distinguen sin filtrar contenido ni producir notas falsas.
- **SC-003**: A360 y1440 px se pueden editar los controles y consultar la referencia histórica sin desbordamiento; ningún flujo de estudiante solicita el historial.
- **SC-004**: Publicación conflictiva/migración/reversión conservan datos; regresiones y CI completos antes de declarar la entrega apta para fusionar.

## Assumptions and Scope

Propietarios008/012/116; mantenimiento de lectura, no cambio del algoritmo de nota ni del escáner131. La prueba física reportada por el usuario fue Android, no iPhone: no cierra las puertas de131. Este hotfix no garantiza ausencia de fallos del proveedor ni precisión OCR universal. La referencia previa puede proceder de otra evidencia y se etiqueta como histórica; no sustituye la evaluación actual.
