# Validación: Recursos de clase con vistas claras y completas en celular

## Pruebas

```
npx vitest run src/modules/herramientas     pasan (75; 11 nuevas)
npx tsc --noEmit  y  eslint src/modules/herramientas     sin errores ni avisos
```

## Capturas después del cambio

Recursos reales generados en local con el modelo económico de producción.

- **390 px**:
  - Crucigrama de 14 columnas: grilla completa.
  - Sopa de letras de 13 columnas: todas las columnas.
  - Relacionar pares: «Invertebrado» y «Ave (vertebrado)» enteras.
  - Taller: enunciado a todo el ancho; «Opción múltiple · Dificultad baja · 1 punto» debajo; «A) El conejo».
  - Rúbrica: «30%» en una línea.
  - Ficha: opciones A) B) C) D) una por línea.
  - Tarjetas: «No la sé», «Dudé», «La sé».
- **PC (1440 px)**: crucigrama, sopa de letras, relacionar pares y taller conservan su tamaño.
- Las instrucciones aparecen una sola vez en todos los tipos.
