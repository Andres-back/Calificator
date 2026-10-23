# Validación

1. Ejecutar nuevas regresiones y comprobar que detectan el comportamiento actual.
2. Probar texto/imagen con 1, 8, 24 y 100 componentes, rúbrica y override; techo finito.
3. Simular cortes y rechazos en tres formatos: sin nota, sin contenido sensible, conteos válidos.
4. Ejecutar regresiones de orquestación, cálculo, ledger y recalificación, suite backend y lint.
5. Laboratorio: botón real sobre copia anónima, historial/base aislados y máximo de llamadas autorizado. Documentar salida, cobertura, tiempo y límites sin nombres/fotos en Git.
6. Abrir PR y comprobar CI; no desplegar ni recuperar notas reales sin autorización independiente.

## Evidencia de validación — 2026-10-23

- TDD: las nuevas pruebas detectaron primero el módulo ausente; los casos de diagnóstico detectaron después cuatro fallos concretos (código perdido en verificador y causas ausentes en resultado). Tras la implementación: 80 pruebas focalizadas aprobadas.
- Suite `backend/tests/unit`: **1364 aprobadas, 2 omitidas**, 64,90 s en Python 3.13/Windows. Las omisiones ya pertenecen a sus condiciones de entorno; no se desactivaron pruebas.
- Lint de archivos modificados: aprobado. Reglas de CI `F401,F821,F822,F823,F841` sobre `backend/app backend/tests`: aprobado. El lint completo sin la selección de CI encontró 47 infracciones previas en analítica no modificada; no se amplió el hotfix para reformatearla.
- Regresiones de cálculo, persistencia, permisos e historial incluidas en la suite unitaria; falta CI con Linux y servicios de integración antes del merge.

### Botón real y entrega anónima

Se usó el componente real «Volver a calificar», endpoint real, cola interceptada solo para ejecutar el worker en la base local aislada y una única copia de evidencia anónima. La lectura se comprobó manualmente para reservar las dos llamadas a valoración. No es una prueba completa de extracción automática nueva.

| Intento autorizado | Límite de salida | Resultado | Uso de salida | Duración de la llamada por proxy SSH |
|---|---:|---|---:|---:|
| Valoración inicial | 3072 | Incompleto por `max_output_tokens` | 3072 | 83,29 s |
| Recuperación existente, límite ampliado solo en laboratorio | 16 384 | Completo, 24 componentes | 3899 | 81,85 s |

El endpoint aceptó la operación con HTTP 202. La base sintética conservó una revisión `recalificar` para esta ejecución y los trabajos padre/hijo terminaron `success`; el resultado local guardó una propuesta **3,17/5**, sin confirmarla ni publicarla. El wrapper de cierre del laboratorio aún esperaba liberar conexiones al capturar el informe; el éxito citado proviene del estado persistido de los trabajos, no de ese wrapper.

**Limitación importante**: la foto solo muestra respuestas hasta la 21; faltan 22–24, posiblemente en el reverso. La cobertura fue 87,5 % y el resultado siguió `requiere_revision`. El modelo asignó `sin_respuesta`/0 a esas tres preguntas en el desglose, lo cual NO demuestra que el alumno las dejara vacías: se necesita la página faltante o revisión docente. No se presenta la propuesta como calificación correcta definitiva ni se modifica esa política en este hotfix.

No se ejecutó una llamada al verificador GLM; no se añadieron más llamadas al agotar el límite autorizado. Dos peticiones anteriores del montaje local fueron rechazadas por autenticación y no produjeron inferencia válida; se informó al usuario y se obtuvo autorización nueva antes de estas dos llamadas.

La clave permaneció en el VPS. No se cambió configuración, notas, evidencias ni usuarios de producción. Los resultados con respuestas permanecen en carpeta privada local ignorada por Git; solo esta síntesis técnica se versiona.

### Comandos reproducibles sin IA

Desde el repositorio, con las dependencias del backend:

```powershell
$env:PYTHONPATH='backend'
python -m pytest backend/tests/unit/test_grading_output_budget.py backend/tests/unit/test_ai_api_transport.py backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_ai_usage_pipeline.py -q
python -m pytest backend/tests/unit -q
python -m ruff check --select F401,F821,F822,F823,F841 backend/app backend/tests
```

### Estado de entrega

- Inventario regenerado en una exportación limpia de `main` más los archivos propios del hotfix: 632 superficies. Solo cambió `specs/system-inventory/current.json`; no se incorporaron las modificaciones ajenas de Specs 034/115.
- Gobernanza en esa copia: 47 pruebas aprobadas y 2 fallidas. Una exige completar T009 (incluye publicar el PR, aún pendiente); la otra no pudo arrancar Git Bash por la restricción Windows `NtCreateDirectoryObject / 0xC0000022`. No se omitió ni modificó ninguno de esos controles para aprobarlos.
- Las copias temporales originales con identidad y la vista previa insuficientemente anonimizada fueron eliminadas; permanece la copia anónima. Original de producción intacto. Navegador y servidores de laboratorio detenidos, sin nuevas llamadas a IA.
- No hay PR nuevo ni despliegue. La revisión automática de permisos del entorno devolvió un fallo por límite de uso antes de ejecutar la siguiente operación privilegiada. No se intentó eludirla. T009 sigue abierta hasta publicar y comprobar gobernanza/CI en el entorno permitido.

No desplegado. Los cambios ajenos de Specs 034/115 se excluyen de la entrega.
