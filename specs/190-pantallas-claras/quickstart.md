# Validación: Quitar lo que estorba en Crear material, Analítica y Xali

## Pruebas

```
npx vitest run src/modules/xali src/modules/analytics src/modules/herramientas
  pasan (4 nuevas)
npx tsc --noEmit  y  eslint de los módulos tocados      sin errores
```

## Capturas después del cambio (390 px)

- **Crear material**: «1. ¿Qué necesitas hacer en tu clase?» aparece en la primera pantalla.
- **Analítica**:
  - Sin tarjetas vacías ni «línea base».
  - «Resumen de mis clases» y «Coincidiste con la IA».
  - Evaluaciones como tarjetas legibles («Borrador», «Publicada» en una línea).
- **Xali**: el saludo «Hola, soy Xali 👋» y las sugerencias se ven al abrir.
