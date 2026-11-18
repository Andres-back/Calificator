# Plan: Foto o archivo también en criterios de aprendizaje e instrucciones

**Spec**: [spec.md](spec.md) | **Issue**: [#425](https://github.com/Andres-back/Calificator/issues/425)

## Decisión

- **Backend** `dba/router.py`: la subida de documentos usa `capture_text` (Spec 201) en vez de exigir PDF o Word según el tipo declarado. El resto del flujo (sugerencias y fuente de consulta) no cambia.
- **Frontend**:
  - `TextCaptureButtons`: nueva variante `compact`, sin la nota de formatos.
  - `herramientas/forms/base.tsx` (`ExtraInstructions`) y `presentaciones/PresentacionForm.tsx`: botones compactos, tope de 6.000 caracteres.
  - `materias/MateriaDbaPage.tsx`: tipos aceptados y textos.

## Costo

Los criterios desde foto usan la lectura económica de la digitalización. Word, Excel, CSV, texto y PDF con texto no usan IA para la lectura.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/dba/router.py` | lectura con `capture_text` |
| `frontend/src/components/capture/TextCaptureButtons.tsx` | variante compacta |
| `frontend/src/modules/herramientas/forms/base.tsx`, `frontend/src/modules/presentaciones/PresentacionForm.tsx` | botones en instrucciones |
| `frontend/src/modules/materias/MateriaDbaPage.tsx` | formatos y textos |
| `frontend/src/modules/herramientas/forms/ExtraInstructions203.test.tsx`, `frontend/src/components/capture/TextCaptureButtons.test.tsx` | pruebas |

## Dependencia

Spec 201. Este PR se abre cuando el de la 201 esté en main.
