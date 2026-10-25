# Lista de calidad de requisitos: devolución y conversación

**Propósito**: revisar claridad, completitud, coherencia y medición antes de implementar.
**Creada**: 2026-10-24
**Especificación**: [spec.md](../spec.md)

> Marcadores del revisor: [x] aprueba calidad del requisito, no implementación. El usuario autorizó esta revisión el2026-10-24.

## Completitud y consistencia

- [x] CHK001 ¿Están definidas una sola autoridad del mensaje y las entradas individual/grupal sin formularios competidores? [Completitud, Spec FR001–003]
- [x] CHK002 ¿Se preservan selección, lote, impresión, copia y fallos parciales sin autorización implícita? [Consistencia, Spec FR004–005]
- [x] CHK003 ¿Se separan guardado, nota y entrega, con conflictos y protección de ediciones/historial? [Claridad, Spec FR002–005/015]
- [x] CHK004 ¿Se delimita continuidad del navegador, aislamiento de lectores y legado sin asignación demostrable? [Cobertura, Spec FR006–007/010]

## Cobertura de límites

- [x] CHK005 ¿Están definidos vencimiento, revocación, renovación, sustitución de revisión y retención sin acceso residual? [Cobertura, Spec FR008]
- [x] CHK006 ¿Se mantiene cinco preguntas por diez minutos entre dispositivos y recuperación sin reenvío ni doble consumo? [Medición, Spec FR009/SC003/007]

## Presentación y aceptación

- [x] CHK007 ¿La decoración y el formato distinguen pregunta/respuesta y pasos reales, excluyen contenido externo activo y no generan gasto ni significado inventado? [Claridad, Spec FR011–013/SC005]
- [x] CHK008 ¿Son medibles responsividad, accesibilidad, mensajes extensos e impresión completa en ambas pantallas/temas? [Medición, Spec FR014/SC002/006]

## Notas

Revisión autorizada completada8/8 el2026-10-24: FR001–005 resuelven autoridad/selección/guardado; FR006–010 y sus supuestos delimitan continuidad, vigencia y cuota; FR011–014 cuantifican formato, decoración y pantallas. Sin inconsistencias bloqueantes. No significa implementación o pruebas terminadas.
