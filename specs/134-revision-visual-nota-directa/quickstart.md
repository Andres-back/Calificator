# Guía de validación — Spec 134

Plan ampliado, Checklist, Tasks y Analyze aprobados/completos; implementación y Converge completos. Resultados y límites de las ejecuciones en [validation.md](./validation.md). Usar datos sintéticos y PostgreSQL aislado, nunca la copia de producción ni claves/IA.

## Comandos reproducibles

Desde frontend, con dependencias bloqueadas instaladas:

```powershell
npm run lint:strict
npm run typecheck
npx vitest run --maxWorkers=2
npm run build
npx playwright test e2e/grade-direct-review.spec.ts --workers=1
```

Desde el entorno backend de pruebas:

```powershell
python -m ruff check --select F401,F821,F822,F823,F841 app tests
python -m pytest tests/unit -q
```

Para la integración, definir `SPEC134_TEST_DATABASE_URL` hacia una base local aislada llamada `spec134` y ejecutar `python -m pytest tests/integration/test_grade_direct_adjustment.py -q`. La fixture rechaza destinos distintos de localhost/127.0.0.1/spec134-db, crea esquemas aleatorios propios y elimina solo esos esquemas al terminar. Prueba rollback con lectura posterior real, no solo mocks. El E2E usa Chromium/WebKit con configuración existente; no necesita cuentas ni red de producción.

## Recorridos de comprobación

1. Nota confirmada 4,1 → «Editar nota» → `4,5` → guardar. Revisión/libro coinciden al recargar; conservar puntos/evidencias y propuesta inicial en historial.
2. Cero, ajuste previo, base fraccionaria y registro con precisión adicional; cancelar/no cambios no mutan. Publicada requiere advertencia y nueva publicación; enlaces afectados quedan suspendidos.
3. Dos sesiones guardan: segunda rechazada con borrador. Doble envío misma operación: un evento. Fallo inducido durante escritura: rollback total. Alumno, ajeno o sin permiso: denegado.
4. Antiguo sin desglose o incompleto: no inventar preguntas/ceros; conservar avisos. Procesando/anulada no se editan.
5. Confianzas 0,69/0,70/0,84/0,85, ausente/inválida; uno/dos evaluadores; contradicciones; objetiva correcta/incorrecta; revisión individual docente. Resumen/botón/tarjeta coinciden. Ajustar global no limpia prioridades.
6. A 360/390/1440 px, claro/oscuro: teclado, foco, controles 44 px, sin desbordamiento y selección que conserve el color. Registrar capturas sintéticas, no afirmar prueba física.

Ejecutar regresiones, inventario, gobernanza y Converge. Registrar resultados reales antes de abrir PR con #281; no fusionar ni desplegar automáticamente.
