# Plan: calificacion visual rapida y terminal

## Causa raiz

El snapshot del job solo contenia `calificacion_foto`. El orquestador lo aplicaba exclusivamente
a la extraccion y conservaba nombres de modelos antiguos codificados para los evaluadores. Ademas,
el worker contabilizaba como procesada una Calificacion persistida aunque no tuviera nota.

## Implementacion

1. Crear un snapshot compuesto e inmutable para vision y calificacion textual al crear jobs de
   calificacion, manteniendo lectura del formato plano anterior.
2. Resolver modelos y credenciales OpenCode por etapa en el orquestador.
3. Corregir los defaults al identificador valido `deepseek-v4-flash-vision-exp`.
4. Migrar unicamente rutas institucionales intactas (`config_version=1`, sin editor) para no
   sobrescribir configuraciones administrativas reales.
5. Convertir una calificacion sin nota en fallo terminal recuperable despues de persistir la
   evidencia y el diagnostico.
6. Cubrir en pruebas el enrutamiento, compatibilidad, exito y fallo sin nota.

## Seguridad y compatibilidad

- Sin cambios en endpoints publicos ni payloads del frontend.
- Sin timeouts que abandonen una inferencia activa.
- Sin logs de contenido educativo o secretos.
- La migracion es condicional y reversible solo para filas por defecto no editadas.

## Medicion

- Produccion antes del hotfix: 168.65 s, sin nota; extraccion Qwen seguida por dos
  evaluadores con contratos fallidos.
- Pipeline corregido con la misma evaluacion y fotografia: 54.84 s, nota valida y
  revision docente conservada.
- Desglose corregido: vision 19.19 s, evaluador principal 12.58 s, verificador
  6.52 s y arbitraje excepcional 16.40 s.
- La reduccion observada fue de aproximadamente 67 %. Los tiempos dependen de la
  carga del proveedor; el criterio estable es no usar fallback en el camino normal
  y terminar siempre con nota o fallo recuperable.
