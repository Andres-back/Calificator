# Contratos API y UI

Propuesta compatible; solo será contrato implementado cuando pase pruebas y merge. Prefijo `/api`. Respetar CSRF y cookies actuales. No incluir datos reales en fixtures.

## Documentos: contrato existente

`GET /evaluaciones/{evaluacion_id}/pdf?soluciones=false|true&descargar=false|true` y `GET /evaluaciones/{evaluacion_id}/docx?soluciones=false|true`.

Conservar endpoint y permisos existentes, PDF/Word privados con `Cache-Control: private, no-store` y tipo correcto. Usar PDF.js local para leer blob, no otro endpoint público ni recurso en CDN. Inicialmente solucionario falso; autorización de solucionario en servidor, selección explícita y limpieza de páginas previas. Estados UI: cargando/renderizando/listo/error/reintentando; controles página anterior/siguiente, ampliar, descargar y cerrar con foco restaurado.

## Criterios: PATCH parcial compatible

`PATCH /evaluaciones/{evaluacion_id}` agrega opcional `expected_updated_at` al schema existente. Editor 084 debe enviarlo con la versión leída, y solo los campos de criterios realmente cambiados. Clientes históricos sin esta precondición conservan su contrato; documentar que el control nuevo protege el recorrido 084, no prometer concurrencia protegida en todo cliente antiguo.

```json
{
  "expected_updated_at": "2026-10-05T14:00:00Z",
  "dba_personalizado_ids": [],
  "criterios": []
}
```

Ejemplo sin datos reales: listas vacías representan eliminación explícita elegida, no defaults que borren selecciones. Campo ausente conserva su valor. Precondición atómica; 409 ante conflicto, 422 ante datos inválidos, permisos según contrato actual. Error no modifica evaluación. Respuesta usa `EvaluacionRead` actual y versión nueva.

Crear criterio mediante `POST /materias/{materia_id}/dba-personalizados` existente con `dba.manage` y propiedad; reutilizar schema actual, sin duplicar catálogo ni renombrar rutas públicas. Acción visible se llama «Criterios de aprendizaje»; rúbrica aparte. Guardar no llama a IA ni serializa preguntas.

## Alta manual: adición

`POST /materias/{materia_id}/importaciones-estudiantes/manual` crea o recupera lote manual en revisión. Declarar ruta estática antes de `/{lote_id}` para evitar colisión de parsing.

Entrada: `operation_id` UUID y `filas` con shape de `FilaUpdate` existente, de 1 a 100: nombre revisado, decisión y referencia cuando corresponda. No admitir rol, contraseña, correo externo arbitrario ni ID de otro docente. Permiso `subjects.update` + propiedad/administración de materia.

Respuesta: `LoteRead` existente con ID reutilizable, job nulo, filas y estado. Nueva creación 201; replay válido 200 con lote actual, incluido confirmado. UUID con contenido/contexto incompatible 409. Reintento concurrente usa unicidad de PK y transacción. Antes de devolver un lote validar autorización de actor y materia.

Revisar/confirmar usa PUT de filas y POST confirmar actuales; guardar solo cuando no está confirmado. Separar mutaciones y recuperar estado tras pérdida de respuesta. Confirmación actual conserva respuesta `ConfirmacionRead`; replay confirmado no devuelve secretos. No intentar recrear lote para recuperar claves.

## Credenciales e impresión

`POST /materias/{materia_id}/estudiantes/{student_id}/clave-temporal` existente. Agregar permiso efectivo de modificación además del alcance de materia; misma respuesta `TemporaryPasswordRead`. Confirmación UI explícita advierte efecto en toda la cuenta. Respuesta sensible no-store y sanitización de observabilidad; no cache de secretos.

Fichas seleccionadas mediante portal privado, estilos print y cortes. «Imprimir» solo invoca impresión de contenido disponible; cero solicitudes de contraseña. Sin fichas nuevas, mostrar matrícula completada sin prometer claves recuperables. Fallo/impresión cancelada no renueva. Claves perdidas: renovación separada autorizada. No imprimir DOM de menús, otros grupos o la página completa.

## Perfil propio

`GET/PATCH /users/me` existente, único objetivo derivado de sesión. PATCH agrega `current_password` opcional; obligatorio si cambia realmente email o password. Solo acepta `nombre`, `email`, `password`, `current_password`; rechazar extra/nulls inválidos. Validar nombre 2–160, password 8–128 y email único según contratos actuales.

Respuesta mantiene `UserSelfRead`. Nombre/email exitosos refrescan auth store sin sustituir permisos efectivos. Cambio de password devuelve éxito, limpia cookies y exige nuevo login; documentar cliente para que no lance fetchMe con sesión revocada. 422 por clave actual errónea, validación o confirmación local; email duplicado mantiene código público existente con mensaje de campo. 401 solo por sesión realmente inválida. Rollback de toda la operación en errores.

Ruta UI `/app/perfil`, lazy y protegida por autenticación; acceso desde menú de cuenta del profesor, sin botones administrativos ni edición de terceros. Perfil no cambia rol ni permisos. Mensajes indican correo vigente de login y confirmación de cierre tras nueva clave.

## Contrato responsivo compartido

Nombre de materia y selector visibles en primer viewport; ayudas/detalles cerrados; 44×44 mínimo en controles táctiles; un scroll de contenido sin interceptar gestos. Preservar loading/error/cola/cambios sin guardar fuera de secciones decorativas. Restaurar foco y posición al cerrar; diálogos utilizables con teclado móvil abierto. Capturas automáticas únicamente fixtures ficticias sin credenciales.
