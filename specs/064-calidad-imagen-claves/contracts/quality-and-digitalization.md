# Contratos

## Digitalización desde archivo

`POST /evaluaciones/externa/digitalizar-con-archivo` conserva su contrato multipart y respuesta 202.

El resultado del job añade sin romper compatibilidad:

```json
{
  "clave_completa": false,
  "claves_pendientes": [2],
  "advertencias": ["La foto puede estar oscura; se mejoró automáticamente."]
}
```

La evaluación sigue creándose como borrador. Una clave pendiente no causa 502; publicar continúa devolviendo 409 hasta que el docente complete las respuestas.

## Preparación de imagen

`prepare_orientation_variants` conserva el tipo de retorno y agrega diagnóstico opcional a cada variante. Archivos no imagen mantienen el comportamiento anterior.

## Interfaz

La selección de una fotografía muestra uno de estos estados:

- “Foto lista para leer”.
- “Esta foto puede verse borrosa/oscura” con acciones para repetir o continuar.
- “No pudimos leer este archivo” y bloqueo hasta reemplazarlo.

No solicita esquinas ni recorte manual.
