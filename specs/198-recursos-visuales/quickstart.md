# Validación: Ilustraciones para la portada, el inicio del docente y Crear material

## Pruebas

```
npx vitest run src/modules/auth src/modules/dashboard src/modules/herramientas     pasan (108; 3 nuevas)
npx tsc --noEmit  y  eslint de los archivos tocados                                 sin errores ni avisos
```

## Revisión visual

- **Hoja de contacto**: las once imágenes sobre fondo claro y oscuro, sin fondo blanco ni recuadro; la pantalla de Xali es azul marino en ambos.
- **Portada (1440 px y 390 px)**: una ilustración por beneficio y la mesa de docentes sobre «Queremos construirlo con docentes reales».
- **Inicio del docente (1440 px)**: Xali junto al escritorio, a la izquierda del saludo. En 390 px no aparece.
- **Crear material**:
  - 1440 px: cinco tarjetas con icono arriba.
  - 390 px: cinco filas compactas con el icono a la izquierda.
- Sin desplazamiento lateral ni imágenes rotas en ninguna captura.

## Peso

Ilustraciones de 24 a 60 KB; iconos de 11 a 18 KB.
