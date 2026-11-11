# Validación: Spec 166

Entorno: Windows 11, Node 22 y Vitest con jsdom. Datos sintéticos, sin API real en las pruebas. La comprobación en el navegador usó la aplicación local con usuarios sintéticos.

## Pruebas primero: RED

| Prueba (en `frontend/`) | Resultado antes de la corrección (`main` @ `3ddc2d3`) |
| --- | --- |
| `npx vitest run src/modules/materias/MateriaEvaluaciones.test.tsx -t "166"` | ❌ 2 de 3 fallan: el cuerpo enviado no trae `expected_updated_at` ni `expected_content_version_id`. La tercera protege que un rechazo conserve el formulario |

## Después de la corrección: GREEN

| Comando (en `frontend/`) | Resultado |
| --- | --- |
| `npx vitest run src/modules/materias/MateriaEvaluaciones.test.tsx -t "166"` | ✅ 3 |
| `npx vitest run src/modules/materias` | ✅ 167 en 21 archivos |
| `npx tsc --noEmit` | ✅ |
| `npx eslint` de los dos archivos cambiados | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Comprobación en el navegador

Aplicación local, evaluación publicada con reparto de puntos guardado y una entrega:

| Paso | Antes | Después |
| --- | --- | --- |
| Más opciones › «Editar datos» › «Guardar cambios» | 409 «La evaluación cambió…», también al reabrir | 200 y aviso «Evaluación actualizada»; la tarjeta muestra el dato nuevo |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (fecha de actualización) | `incluye la fecha y la versión de contenido…` y `sin versión de contenido envía solo la fecha de actualización` |
| FR-002 (versión de contenido) | `incluye la fecha y la versión de contenido…` |
| FR-003 (rechazo conserva el formulario) | `un rechazo deja el formulario abierto con lo escrito` |
| FR-004 (regresión) | la tabla RED |

## Observaciones

- Guardar «Editar datos» en una evaluación con versión crea una versión de contenido nueva, igual que desde la página general de evaluaciones.
- No hay prueba E2E de Playwright para este formulario. La cobertura es de componente y manual.
- La corrección no cambia el backend ni filas de producción.
