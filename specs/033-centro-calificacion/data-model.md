# Proyecciones y contexto de revisión

Sin tablas ni migraciones nuevas previstas.

- **ReviewContext**: materiaId, evaluacionId, estudianteId, calificacionId, componenteId, pagina >=1, filtro y modo. Identificadores opcionales hasta selección; validar jerarquía autorizada. URL con IDs/filtros, nunca respuestas/archivos.
- **Fila**: matrícula + calificación vigente según criterio actual + entrega/job. Estado persistido y nota nullable. Todos los matriculados incluidos, incluso sin entrega.
- **Resumen**: conocimiento completo/ausente, bloqueos vigentes, cantidad de componentes pendientes/ilegibles, PQRS abiertas y versión. Contadores desconocidos null, no cero. Restringir datos de PQRS a permisos correspondientes.
- **Alerta derivada**: id estable por calificación/versión/tipo/referencia, causa, origen, alcance global/componente/incidencia y páginas opcionales. No persiste segunda máquina de estados.
- **ReviewDraft**: calificacionId, componenteId, versionEsperada, cambios, dirty, guardando/error/conflicto. Reiniciar solo tras persistencia o descarte explícito.

Prioridad: bloqueos vigentes → solicitudes abiertas y revisión necesaria → informativas. Desempate estable por fecha/id, sin mover selección durante edición. Lectura ilegible usa estado/indicador registrado; sin respuesta no implica hoja faltante. Desacuerdo exige valoraciones comparables y la regla existente de consenso; raw pipeline histórico no mantiene alertas resueltas por docente. Confianza sola no permite inferir error.

Guardar → respuesta confirmada → invalidar resumen/detalle → avanzar al destino capturado. Error/conflicto conserva borrador. Resolver PQRS no publica nota. Publicar mantiene validaciones actuales.

PQRS nuevas transmiten componente_id/desglose_version existentes, verificando pertenencia. Para antiguas, preservar versión y resolver clave estable solo con correspondencia cierta; ausencia de vínculo queda a nivel de calificación. Estudiante conserva ocultación de claves y notas no publicadas.
