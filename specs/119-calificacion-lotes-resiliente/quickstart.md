# Validación del hotfix 119

1. Ejecutar primero regresiones sintéticas de política, agentes y recuperación; comprobar el fallo en la versión base antes de implementar.
2. Simular veinte entregas con máximo global cuatro: sin fallos, una llamada por rol; con fallo transitorio del verificador, solo ese rol realiza un segundo intento.
3. Simular fallo del principal y recuperación: principal dos intentos, verificador uno. Con error permanente o repetido, no superar dos intentos ni publicar una propuesta parcial.
4. Guardar progreso en PostgreSQL de pruebas, reiniciar y recuperar con claim nuevo: conservar resultados compatibles y contador; rechazar claim antiguo y huella incompatible. Mantener la decisión docente guardada durante la inferencia.
5. Transporte simulado: tope de 60 tras admisión; espera de turno fuera del plazo; errores de conexión/lectura identificables; otras funciones conservan sus límites. No utilizar API externa ni evidencia real.
6. Administración muestra política efectiva; revisión docente distingue segunda revisión pendiente en 360 px y escritorio sin controles nuevos invasivos.
7. Ejecutar lint, suite backend aplicable, pruebas frontend/build, gobernanza en export limpio e inventario actualizado. PR vinculado al issue #253 y a esta spec. Sin merge ni despliegue manual.

Comandos locales orientativos (desde raíz del checkout):

```powershell
python -m pytest backend/tests/unit/test_grading_recovery.py backend/tests/unit/test_photo_grading_failures.py backend/tests/unit/test_tasks_grading.py
python -m pytest tests/spec_governance
```

Los requisitos de base aislada y frontend siguen los scripts del repositorio. La verificación de producción, cuando se autorice después de CI verde, se limita al commit/política/salud; no vuelve a calificar entregas reales automáticamente.

## Evidencia local — 2026-10-23

- TDD: fallos iniciales por falta del controlador, límite configurado de 45 en vez de 60 y ausencia de recuperación/traza del árbitro; corregidos antes de la validación final.
- Backend unitario y captura de configuración: 1.417 pruebas aprobadas, dos omitidas por condiciones anteriores del entorno Windows (WeasyPrint y permiso de enlaces simbólicos). Incluye presupuesto de salida anterior, cálculo, fotos, permisos, prioridad docente y recuperación del mismo rol.
- PostgreSQL 16 desechable: una prueba integrada aprobada con veinte trabajos, reserva de intentos antes de llamar, interrupción/reclamación del lease, reutilización de valoración, segundo intento del verificador, rechazo de claim/usuario/entrega ajenos, progreso privado y dos entregas distintas en un lote. Estado padre requires_review cuando falta revisión. Sin base académica real.
- Lote normal simulado: 40 llamadas de valoración/verificación para veinte entregas; con cuatro fallos temporales de verificación, 44 llamadas y veinte valoraciones principales realizadas una sola vez. Límite compartido real ejercitado con Redis simulado, pico cuatro.
- Rendimiento: comparación del pipeline en memoria con respuestas instantáneas y un control sin almacenamiento de etapas; mediana dentro del 10 % solicitado y sin llamadas añadidas. No mide latencia de Internet ni coste de commits SQL; no se extrapola como garantía productiva. Se eliminó serialización duplicada y JSON bruto redundante del progreso.
- Frontend seleccionado: 19 pruebas aprobadas; TypeScript y lint de archivos modificados correctos. Build local aprobado. Aviso pendiente compacto junto al estado de nota, sin bloque adicional.
- Navegador: revisión docente aprobada en 360, 390 y 1366 px, sin desbordamiento horizontal y conservando evidencia, edición y accesos. Administración aprobada en 360/390/768/1366/1920 y ambos temas. El fallo inicial a 360 px permitió compactar el aviso. La prueba administrativa se repitió aisladamente para evitar cierre de un servidor compartido entre dos procesos de pruebas.
- Gobernanza: 49/49 controles aprobados sobre un export limpio del índice. Inventario vigente: 632 superficies. Se excluyeron cambios ajenos de otras especificaciones; se corrigió la referencia textual explícita a FR-005 antes de cerrar la validación.
- Converge detectó presupuesto incompleto del árbitro y telemetría de reutilización: T018/T019 añadidas y resueltas. El identificador de ejecución se conserva; la duración de una etapa reutilizada no se vuelve a contar como trabajo nuevo; se registra la espera de capacidad separadamente.

## Activación y límites

No se cambiaron configuración compartida de proveedores, modelos, claves, notas o evidencias productivas. Cero inferencias reales nuevas. El tope específico de calificación se captura y muestra como política; no eleva en secreto el timeout de Xali/recursos. Se conservan los adaptadores heredados y el flag de contingencia cruzada sin activarlo.

La entrega no repara ni reenvía automáticamente los registros previos. Solo se reutiliza progreso con huella compatible del mismo trabajo y entrega; una ejecución nueva o evidencia cambiada no hereda propuestas sin comprobar. Los servicios externos pueden seguir fallando: al agotar los intentos se conserva una propuesta pendiente y nunca se publica por ese solo motivo.

Merge, CI remoto y despliegue productivo permanecen pendientes de la entrega por PR y la autorización correspondiente.
