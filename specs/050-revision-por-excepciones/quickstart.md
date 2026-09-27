# Validación rápida: Revisión por excepciones

## Preparación

1. Instalar dependencias del frontend con el lockfile vigente.
2. Usar una calificación simulada con al menos una respuesta segura, una de atención y una bloqueada.

## Escenarios

### Clasificación

Ejecutar las pruebas de `buildReviewTriage`. Deben demostrar exclusividad de niveles, razones y prioridad.

### Interfaz

Abrir el workspace docente:

1. Confirmar los tres conteos.
2. Pulsar “Revisar primera excepción”.
3. Comprobar que cambia la pregunta y, si existe, la hoja de evidencia.
4. Pulsar “Siguiente excepción”.
5. Expandir las respuestas sin alertas y abrir una de ellas.
6. Confirmar que ninguna acción cambia la nota.

### Regresión

- Editar puntaje y explicación con el editor vigente.
- Confirmar una nota mediante la acción existente.
- Ver una calificación heredada sin desglose.
- Repetir a 360×800 y por teclado.

## Comandos

```powershell
cd frontend
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
```

El CI completo ejecuta además backend, contenedores y E2E.

## Resultado de validación — 2026-09-19

- Clasificación, panel, analítica y desglose: 32 pruebas frontend aprobadas.
- Política analítica backend: 33 pruebas aprobadas; una advertencia deprecada de `dateutil` ajena al cambio.
- Regresión Playwright móvil 360×800: 1 prueba aprobada, sin mutaciones de nota ni desbordamiento horizontal.
- TypeScript: aprobado.
- ESLint: aprobado.
- Ruff focal: aprobado.
- Build Vite de producción: aprobado; conserva el aviso histórico de chunks grandes.
