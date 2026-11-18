# Validación: Ilustraciones para pantallas vacías y de error

## Pruebas

```
npx vitest run src/components src/modules/materias src/modules/presentaciones    pasan (447)
npx tsc --noEmit  y  eslint de los archivos tocados                              sin errores
```

## Capturas (390 px)

- **Presentaciones** sin presentaciones: Xali junto a un tablero.
- **Criterios de aprendizaje** sin criterios: libro con lista de verificación y diana.
- Hoja de contacto en fondo claro y oscuro: ninguna imagen tiene fondo blanco y la pantalla de Xali se ve azul marino en ambos.
