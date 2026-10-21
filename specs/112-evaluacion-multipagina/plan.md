# Plan: Recuperar calificación multipágina
**Rama**: `codex/112-evaluacion-multipagina` | **Fecha**: 2026-10-21 | **Spec**: [spec.md](./spec.md) | **Issue**: #232

## Resumen
Hotfix abreviado por solicitud humana expresa; no requiere pausa adicional del plan, pero sí regresiones y CI protegido. Reparar unión y tiempos de visión antes de maquetación/captura, que tendrán entrega separada.

## Contexto técnico
Python, Pydantic, FastAPI/Celery/SQLAlchemy existentes. JSONB aditivo, sin migración de tablas ni nuevas dependencias. Pruebas pytest sintéticas, contenedor y verificaciones de solo lectura del incidente. Los modelos configurados permanecen iguales.

## Verificación de la constitución
- Roles y datos: autorización existente; originales privados sin alteración; diagnóstico no imprime alumnos.
- Integridad: fragmentos legibles conservados con parcialidad y procedencia; no piso objetivo automático con fragmentos parciales; revisión docente prevalece.
- Asincronía: conservar páginas completas al timeout, cancelar tareas pendientes correctamente y representar fallos parciales.
- Recuperación: modo diagnóstico por defecto, respaldo acotado y reanálisis por servicio normal, sin tocar notas existentes o decisiones concurrentes.
- Gobernanza: spec expresa, issue hotfix, pruebas y CI verde; producción solo desde main. Ningún hook de extensión configurado.

## Estructura y decisiones
`services/vision_extractor.py`: agrupar respuestas por pregunta, conservar fragmentos legibles aunque otras páginas sean ilegibles o estén vacías, marcar parcialidad/conflicto y fuentes. Campo compatible de rol de página y presencia de pregunta evita inventar marcadores vacíos para preguntas ausentes. Lectura pura de documento multipágina no usa cascada por falta de respuestas.
Al vencer tiempo global, recoger tareas terminadas y marcar páginas pendientes como fallo temporal; no descartar resultados con wait_for(gather).
`calificaciones/orchestrator.py` y `agents.py`: transportar texto parcial más advertencia al evaluador/verificador, excluir parcialidad de garantía objetiva y mantener revisión.
Recuperación revisable en `scripts/`: sin mutación por defecto; al ejecutar verificar calificación sin nota/decisión docente, estado terminal, propietario/evidencia y contexto congelado; usar reanálisis existente, conservar historial y registrar agregados.

## Validación y límites
Regresión primero con formas sintéticas equivalentes a las observadas (17 marcadores vacíos, 13 respuestas en hoja2 y 4 en hoja3); orden inverso, dibujos, blanco real, ilegibilidad, conflicto, lectura y timeout parcial. Pruebas de prompts y piso objetivo. No añadir datos de menores a Git. Cuando falte una hoja del cuaderno no se promete nota completa ni se inventa cero. Fusión solo con CI verde; recuperar después de despliegue aprobado.
