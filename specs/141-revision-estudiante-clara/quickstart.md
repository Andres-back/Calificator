# Guía de validación — Spec 141

Esta es una guía futura; no implica pruebas ya ejecutadas. Solo fixtures sintéticos y base aislada. No cargar la copia de producción, claves o fotografías reales.

## Preparación

1. Aprobar spec y plan; revisar checklist de calidad; generar Tasks y Analyze antes de implementar.
2. Preparar fixture con ocho/veinte preguntas: completa, pendiente, nota manual, ajuste global, pesos históricos, sección, texto largo y falta de desglose.
3. Preparar dos fotos y un PDF sintéticos con marcas de orientación/esquinas, sin datos personales. Incluir originales/preparados y un legado sin original.
4. Preparar enlaces sintéticos sin secreto real: disponible, sin emitir, expirado, suspendido, error y varios candidatos. Mock de IA, cero llamadas pagadas.

## Ejecución prevista

Desde `frontend`:

```powershell
npm ci
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
npm run audit:actions
npm run audit:build
```

E2E mock: añadir suite `spec141-revision-estudiante-clara.spec.ts` y ejecutarla con Chromium, Firefox y WebKit usando los proyectos configurados del repositorio. La ejecución WebKit local puede requerir un runner Linux aislado y estable: no forzar Docker/WSL si sigue averiado. CI y capturas deben registrar el entorno real utilizado.

Backend: ejecutar suites de revisión, regrade con puntajes actuales, desglose, preparación/almacenamiento de evidencia, permisos y feedback sharing; añadir pruebas del nuevo contrato de edición por referencias. Persistencia/concurrencia se validan en PostgreSQL aislado y descartable, no en la base de producción.

## Recorridos y resultados esperados

1. Materia → Evaluación → Ver notas → Estudiante → volver: mismo contexto, selección y scroll. En móvil la lista no ocupa la cabecera del estudiante.
2. Abrir cálculo: reconstruir 7/10 × 5 = 3,50 y +0,25 = 3,75; mostrar redondeo, escala y límites reales. Cambiar los pesos de una fixture posterior no altera la explicación histórica. Puntajes faltantes → provisional, no ceros inventados.
3. Recorrer ocho/veinte preguntas: controles compactos, prioridad accesible, cuatro elementos útiles, una causa activa sin duplicación. Historial conserva explicaciones técnicas y avisos iniciales.
4. Evidencia: girar vista y volver no cambia ninguna petición de escritura ni nota/enlace. Abrir editor carga hojas existentes; añadir, recortar, ordenar y cancelar conserva todos los hashes y datos.
5. Confirmar edición: validar el paquete, conservar original/snapshot, aceptar un solo trabajo, mostrar progreso y nuevo resultado por revisar. Repetir solicitud no duplica; simular 409, sesión expirada y fallo de almacenamiento no cambia el paquete previo. Probar elección de pesos actuales conjuntamente.
6. Feedback individual: sin lista ni contador grupal; contenido íntegro, tres bloques solo cuando proceden, editar con borrador protegido. Generar/copy en una zona; reabrir recupera el mismo enlace; error o expiración no queda como disponible.
7. Grupo: seleccionar varios, generar solo faltantes, copiar una vez, impresión y publicación desde su propio contexto. Mezclar listo/no listo y fallos parciales sin ampliar permisos ni crear duplicados.
8. Enlace público: chat/historial/cuota/caducidad y permisos conservados; ningún detalle técnico, motivo interno o evidencia original nueva se expone por este cambio de UI.

## Capturas y comprobación física

- Antes de implementar: maqueta sintética de 384 px para cálculo, respuesta, evidencia/editando y feedback/enlace, distinta de una captura de app real.
- Antes de fusionar: implementación real 384/1440 px, claro/oscuro, más 360/412 px, teclado, texto ampliado, carga/error/vencido/conflicto. No incluir fotos o nombres de docentes/alumnos reales.
- Android Chrome e iPhone Safari: probar giro visual, recorte de esquinas, agregar foto, cancelar, teclado y scroll desde el centro de la pantalla. Registrar pendiente si no está disponible un dispositivo; no reemplazar la validación física con emulación.
- No abrir PR como terminado ni fusionar con tareas incompletas, capturas faltantes o CI fallido. No ejecutar despliegues, reinicios, nuevas llamadas IA o cambios de modelos como parte de esta guía.
