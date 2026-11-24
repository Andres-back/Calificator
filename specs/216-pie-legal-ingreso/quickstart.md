# Validación: En «Ingresar», el pie legal no queda encima de la tarjeta

**Spec**: [spec.md](spec.md) | **Issue**: [#454](https://github.com/Andres-back/Calificator/issues/454)

## Cómo comprobarlo

```bash
cd frontend
npx playwright test e2e/auth-navigation.spec.ts
npx vitest run src/modules/auth
npx tsc --noEmit -p .
```

A mano: abrir «Ingresar» en un celular, o en el navegador a 375 px de ancho. El pie con «Privacidad», «Términos», «Cookies», «Aviso de privacidad» e «Información del piloto» aparece debajo de la tarjeta; el botón de tema queda arriba, sin tocarla.

## Resultado del 2026-11-23

- Antes del arreglo, la prueba nueva falla a 320 × 568 y 375 × 812 px y pasa a 1280 × 600 px. En producción, a 375 × 812 px, el pie empezaba en el píxel 709 y el texto «Tu contraseña nunca se guarda en este dispositivo» iba del 701 al 717.
- Con el arreglo: `auth-navigation.spec.ts` 6 de 6 (incluye «Crear cuenta» a 375 × 812 px), pruebas del módulo de ingreso 10 de 10, tipos y lint sin errores.
- Capturas revisadas a 320 × 568, 375 × 812 (claro y oscuro) y 1366 × 768 px: el pie queda debajo de la tarjeta y en computador la pantalla conserva sus dos columnas.

## Límites

- En celular los enlaces legales quedan al final de la página, al desplazar. «Iniciar sesión» sigue visible sin desplazar.
- En «Crear cuenta» solo se corrigió el botón de tema; su pie ya iba después del contenido, igual que en recuperación de contraseña.
