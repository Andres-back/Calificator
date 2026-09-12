# Investigación: Modularización segura de evidencia de calificación

## Línea base reproducida

- `router.py`: 1960 líneas antes de la extracción.
- Responsabilidades a extraer: 1 error tipado y 8 funciones de huella, renderizado, rotaciones, metadatos, limpieza y presentación segura.
- Regresión focal inicial: 33 pruebas aprobadas en revisión, reemplazo, modalidad mixta, persistencia fotográfica y entrega en línea.
- Contratos públicos: dos rutas de lectura de evidencia y los consumidores actuales de carga; no se añade ni retira ninguno.

## Resultado del corte

- `router.py`: 1795 líneas después de la extracción, 165 menos que la línea base.
- `evidence_service.py`: 185 líneas con una única definición de cada una de las nueve responsabilidades identificadas.
- Compatibilidad: el router conserva aliases temporales de las capacidades que consumían pruebas internas.
- Regresión focal: 22 pruebas de servicio/revisión y 18 de reemplazo, modalidad y persistencia aprobadas.
- Cola diferida: `_enqueue_persisted_grading` permanece en el router y no recibió cambios.

## Decisión 1: Primer límite por cohesión

**Decisión**: separar presentación, metadatos y limpieza de evidencia en un servicio interno único.

**Justificación**: estas funciones comparten archivos de entrega y no necesitan conocer la solicitud HTTP completa. El corte reduce el router sin tocar autorización, base de datos o calificación.

**Alternativas consideradas**: dividir todos los endpoints en subrouters fue rechazado por alcance y riesgo; mover solo una función no produciría un límite útil.

## Decisión 2: Compatibilidad progresiva

**Decisión**: el router importará y seguirá exponiendo temporalmente los nombres internos que ya usan pruebas y consumidores.

**Justificación**: permite comprobar primero equivalencia funcional y migrar consumidores en fases posteriores sin un cambio brusco.

**Alternativas consideradas**: cambiar todos los imports y monkeypatches en el mismo PR fue rechazado porque mezclaría extracción con migración de consumidores.

## Decisión 3: Cola fuera de alcance

**Decisión**: conservar `_enqueue_persisted_grading` y toda coordinación de trabajos en el router durante esta fase.

**Justificación**: la cola es crítica para idempotencia, recuperación y rendimiento. Su extracción requiere una especificación propia y pruebas de concurrencia adicionales.

**Alternativas consideradas**: mover evidencia y cola juntas fue rechazado por unir dos riesgos independientes.

## Decisión 4: Dependencias existentes

**Decisión**: reutilizar almacenamiento, Pillow y PyMuPDF actuales sin cambiar versiones, formatos ni parámetros.

**Justificación**: el objetivo es reorganizar propiedad, no alterar calidad o costo de renderizado.

**Alternativas consideradas**: incorporar otra biblioteca o cambiar formatos se descartó por no aportar valor a esta fase.
