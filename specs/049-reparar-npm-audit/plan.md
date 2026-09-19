# Plan 049: auditoría npm estable en CI

## Estrategia

1. Mantener Node.js 22 y el lockfile ya publicado.
2. Instalar npm 11.6.1 explícitamente después de `actions/setup-node`.
3. Ejecutar `npm ci` sin alterar el orden vigente.
4. Envolver `npm audit --audit-level=moderate --omit=dev` en tres intentos con espera incremental de 10 y 20 segundos.
5. Validar la gobernanza, el lockfile y el workflow mediante el CI del PR.

## Riesgos y mitigaciones

- **Ocultar vulnerabilidades**: cada intento conserva el código de salida; el tercero falla el trabajo.
- **Cambio involuntario de dependencias**: no se modifica `package.json` ni `package-lock.json`.
- **Fallo transitorio prolongado del registro**: se informa como fallo de CI después de tres intentos, sin aprobar silenciosamente.
- **Divergencia local/CI**: la versión de npm queda fijada como variable del workflow.

## Regresión exigida

El PR debe demostrar instalación con `npm ci`, auditoría con npm 11, pruebas de gobernanza e inventario sin deriva. El CI completo sigue siendo el criterio final de fusión.
