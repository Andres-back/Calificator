# Validación: Editar hojas también en entregas antiguas guardadas como PDF

## Pruebas

```
python -m pytest backend/tests/unit/test_evidence_edit.py -q
  7 passed
```

Antes de la corrección, las dos pruebas de PDF de varias páginas fallaban con 409. Las demás pruebas de evidencia pasan. Las que fallan en Windows (`test_evidence_scan*`) y los módulos que necesitan `redis` corren en CI.

## Comprobación en producción, solo lectura (2026-11-08)

Dentro del contenedor del backend se leyeron los 45 PDF antiguos sin registro de hojas y se renderizaron sus páginas en memoria, con el mismo método. No se escribió ningún archivo ni dato.

| Medida | Resultado |
| --- | --- |
| PDF editables dentro de los límites | 45 de 45 |
| Hojas por PDF | 1 a 3 (límite 10) |
| Hoja más pesada | 1,3 MB (límite 10 MB) |
| Paquete más pesado | 2,4 MB (límite 40 MB) |
| Tiempo por PDF | 0,15 a 1,7 s |

## Manual

1. Abrir una calificación cuya entrega antigua sea un PDF y elegir **Editar hojas**: aparece una hoja por página.
2. Cancelar: la nota y la entrega no cambian.
3. Girar una hoja, confirmar y **Guardar y volver a calificar**: la entrega pasa a calificarse con la evidencia nueva y la anterior queda en el historial.
