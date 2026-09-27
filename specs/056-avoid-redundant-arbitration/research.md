# Investigación: arbitraje redundante

## Decisión 1: separar solicitud docente de discrepancia entre modelos

**Decisión**: solo una diferencia que alcanza el umbral o una confianza bajo el mínimo activa la tercera valoración.

**Justificación**: en producción ambos evaluadores propusieron 4,17; la marca `primary_requested` inició una llamada adicional de 15.499 ms que devolvió la misma nota. La alerta debe llegar al docente, no provocar automáticamente otra inferencia.

**Alternativas**: dejar el tercer modelo o cortar su tiempo. Se descartan porque la primera prolonga el flujo sin resolver la revisión humana y la segunda arriesga una solicitud en curso.

## Decisión 2: propagar la revisión en la consolidación local

**Decisión**: la salida cercana conserva las banderas de revisión y alertas de ambos evaluadores.

**Justificación**: quitar el tercer modelo sin propagar esas señales presentaría un consenso engañoso.

**Alternativas**: depender de que otra capa vuelva a inferir la revisión. Se descarta para hacer explícito el contrato del comparador.
