<!--
Sync Impact Report
- Version change: plantilla sin versión -> 1.0.0
- Added principles: separación de roles; integridad de calificaciones; procesamiento asíncrono;
  evolución segura de datos; accesibilidad; portabilidad de IA; especificación y pruebas;
  despliegue protegido.
- Added sections: Restricciones del producto; Flujo de desarrollo y calidad.
- Removed sections: ninguna; se sustituyeron todos los marcadores de plantilla.
- Follow-up TODOs: ninguno.
-->
# Constitución de XCalificator

## Core Principles

### I. Separación estricta de roles
Profesor, estudiante y administrador DEBEN acceder únicamente a las capacidades de su rol.
La autorización DEBE aplicarse en backend y frontend; ocultar un control visual nunca sustituye
la validación del servidor. Toda ruta o contrato nuevo DEBE incluir pruebas de acceso permitido
y denegado.

### II. Integridad y trazabilidad de calificaciones
Una entrega DEBE producir como máximo una calificación vigente y conservar historial auditable.
Las evidencias, respuestas extraídas, criterios, confianza, cambios manuales, publicaciones y
PQRS DEBEN ser trazables. La IA propone; el docente conserva la decisión final. Una salida con
cobertura insuficiente o inconsistente NO DEBE publicarse automáticamente.

### III. Procesamiento asíncrono, idempotente y recuperable
Digitalización, visión, generación y exportación que puedan tardar DEBEN ejecutarse sin bloquear
la navegación. Los trabajos DEBEN ser idempotentes, reintentables y observables, con estados
visibles de cola, progreso, éxito y error. Un reintento NO DEBE duplicar entregas, notas ni
archivos persistentes.

### IV. Evolución segura de datos
Todo cambio de esquema DEBE usar una migración revisable, verificable y compatible con los datos
existentes. Eliminaciones de tablas, columnas, rutas o proveedores DEBEN demostrar ausencia de
consumidores y preservar una ruta de recuperación cuando haya datos materiales. No se permiten
tablas, endpoints o adaptadores muertos sin un issue de retiro explícito.

### V. Accesibilidad y experiencia inclusiva
Los flujos críticos DEBEN funcionar desde 360 px hasta escritorio, en modo claro y oscuro, sin
desbordamiento horizontal ni controles inaccesibles. Los objetivos táctiles, mensajes y jerarquía
visual DEBEN ser comprensibles para estudiantes y personas mayores. Cada operación asíncrona DEBE
terminar en un estado visible de éxito, espera o error.

### VI. Proveedores de IA intercambiables y seguros
La lógica de negocio NO DEBE depender directamente de un proveedor o modelo específico. La
selección entre visión y texto DEBE pasar por contratos configurables, con timeouts, fallbacks y
telemetría sin exponer contenido sensible. Claves, contraseñas, tokens y datos personales NO DEBEN
almacenarse en Git ni aparecer en logs, especificaciones o artefactos de CI.

### VII. Especificación y pruebas obligatorias
Todo cambio versionado DEBE estar asociado a un issue y a un directorio `specs/NNN-slug` con
`spec.md`, `plan.md` y `tasks.md`. La especificación y el plan DEBEN recibir aprobación humana antes
de implementar, salvo el proceso abreviado de hotfix definido abajo. Los requisitos DEBEN mapearse
a tareas y pruebas; TypeScript, lint, pruebas frontend, backend, E2E y builds aplicables DEBEN estar
verdes antes del merge.

### VIII. Main protegida y producción reproducible
Está prohibido hacer push directo a `main`. Todo cambio DEBE viajar en una rama `codex/NNN-slug`,
pasar por pull request, gobernanza de especificaciones y CI. Producción solo DEBE actualizarse
desde un commit de `main` aprobado. Despliegues y rollbacks DEBEN ser reproducibles sin depender
de estado manual no documentado.

## Restricciones del producto

- La API pública no cambia durante la adopción inicial de Spec Kit.
- Spec Kit es infraestructura de desarrollo: no se incluye en imágenes ni contenedores.
- La documentación funcional se escribe en español; identificadores técnicos conservan el idioma
  del código existente.
- Evidencias educativas y credenciales se consideran sensibles y se minimizan en pruebas,
  registros y documentación.
- Las especificaciones vigentes son la fuente de intención; cambios de comportamiento actualizan
  la especificación responsable en lugar de crear documentos paralelos contradictorios.

## Flujo de desarrollo y calidad

1. Crear un issue principal y una rama `codex/NNN-slug`.
2. Ejecutar Specify y Clarify; registrar aprobación con `spec-approved`.
3. Ejecutar Plan; registrar aprobación con `plan-approved`.
4. Ejecutar Checklist, Tasks y Analyze antes de implementar.
5. Ejecutar Implement, pruebas y Converge; todas las tareas DEBEN quedar marcadas como completas.
6. Abrir PR enlazado al issue y fusionar solo con todos los controles requeridos en verde.

Un hotfix requiere issue con etiqueta `hotfix`, especificación breve, plan, tareas, prueba de
regresión, PR y CI. Puede omitir únicamente la pausa humana de aprobación del plan; mantiene
obligatoria la aprobación `spec-approved`. No existen excepciones para pushes directos a `main`.

## Governance

Esta constitución prevalece sobre plantillas, planes y prácticas informales. Una enmienda requiere
issue, especificación, justificación, impacto de migración y aprobación humana. Los cambios se
versionan semánticamente: MAJOR para reglas incompatibles, MINOR para nuevos principios o
ampliaciones materiales y PATCH para aclaraciones. Cada PR DEBE declarar la especificación e issue
responsables y demostrar cumplimiento. Las excepciones temporales DEBEN quedar documentadas como
deuda con responsable, fecha límite y criterio de cierre; nunca pueden reducir autorización,
protección de secretos o integridad de notas.

**Version**: 1.0.0 | **Ratified**: 2026-08-14 | **Last Amended**: 2026-08-14