# Quickstart de validación

## Prerrequisitos

- Estar en la raíz del repositorio.
- Usar Python 3.11 o superior.
- No se requieren servicios, contenedores, credenciales ni variables de producción.

## Generar el inventario

python scripts/build_system_inventory.py --write

Resultado esperado:
- current.json y once vistas de dominio se actualizan.
- Cada superficie tiene propietario único.
- No se leen archivos fuera de las raíces permitidas.

## Verificar ausencia de deriva

python scripts/build_system_inventory.py --check
python -m pytest tests/spec_governance -q
git diff --check

Resultado esperado: todos los comandos terminan con código 0.

## Probar determinismo

1. Ejecutar --write.
2. Guardar la huella de los artefactos.
3. Ejecutar --write nuevamente sin cambiar fuentes.
4. Confirmar que Git no muestra diferencias nuevas.

## Probar una superficie sin propietario

La prueba automatizada construye un repositorio temporal con una ruta adicional no cubierta.
El modo --check debe fallar, nombrar la superficie y solicitar actualizar ownership.json.

## Probar una excepción inválida

La prueba automatizada agrega una excepción sin issue o criterio de cierre.
La validación debe fallar sin ocultar la superficie afectada.

## Criterio final

- Inventario completo y determinista.
- Cero propietarios ausentes o múltiples.
- Cero excepciones inválidas.
- Hallazgos críticos y altos enlazados a issues.
- CI Spec governance verde.
## Probar escritura atómica

La prueba automatizada provoca un fallo después de renderizar en memoria. Los artefactos vigentes
deben conservar exactamente sus bytes y no deben quedar archivos temporales.

## Probar un override de permiso inválido

La prueba automatizada referencia una superficie inexistente o carece de issue. La validación debe
fallar y el permiso debe continuar como ambiguous.

## Evidencia de determinismo ejecutada

El 2026-08-14 se ejecutaron dos generaciones consecutivas sobre las mismas fuentes. Los 12 artefactos
(`current.json` y once `inventory.md`) conservaron exactamente su SHA-256; `--check` reportó cero deriva.
## Evidencia de validación integral

- Gobernanza: 29 pruebas aprobadas y `--check` sin deriva.
- Backend: compileall correcto; 389 pruebas unitarias y 1 integración aprobadas; 1 integración condicional omitida.
- Frontend: tipos y lint estricto correctos; 169 pruebas unitarias y 33 E2E aprobadas; build Vite correcto.
- Contenedores: configuración Compose válida e imágenes backend/frontend construidas con las etiquetas `spec-013`.
