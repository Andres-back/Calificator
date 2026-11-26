# Especificación: Datos personales fuera del repositorio público y licencia MIT

**Rama**: `codex/218-datos-personales-repo` | **Creada**: 2026-11-26 | **Estado**: Aprobada e implementada | **Issue**: [#458](https://github.com/Andres-back/Calificator/issues/458)

**Entrada**: el usuario pidió el 2026-11-26 «limpia el repo». El repositorio es público y la tesis lo cita (Anexo R).

## Hallazgo

1. La configuración de la encuesta docente (`encuesta-docente/settings.json` y las cuatro versiones de `encuesta-docente/versions/`) publicaba dos correos personales y un teléfono de los autores. El consentimiento mostraba los correos (`contact_emails`) y el teléfono (`contact_phone`, en el texto que arma `encuesta-docente/app.py`).
2. Cuatro especificaciones (063, 112, 113 y 116) nombraban a docentes del piloto, que la tesis identifica solo con códigos.
3. El repositorio no tenía licencia.

## Escenarios de usuario y pruebas

### Historia 1 - Un visitante no encuentra datos personales (Prioridad: P1)

**Aceptación**:
1. **Dado** el repositorio en `main`, **cuando** se buscan correos personales, el teléfono o los nombres de los docentes del piloto, **entonces** no aparecen.
2. **Dada** la encuesta docente, **cuando** un participante abre el consentimiento, **entonces** ve como contacto el correo institucional de los investigadores.

### Historia 2 - Las condiciones de uso del código son claras (Prioridad: P2)

**Aceptación**:
1. **Dado** el repositorio, **entonces** tiene un archivo `LICENSE` con la licencia MIT a nombre de los dos autores, y el `README.md` lo menciona.

## Requisitos funcionales

- **FR-001**: `contact_emails` de la encuesta, en la configuración vigente y en las versiones guardadas, contiene solo el correo institucional `samirardila2021@itp.edu.co`.
- **FR-002**: Se elimina `contact_phone` de esos archivos y del texto del consentimiento en `encuesta-docente/app.py`.
- **FR-003**: Las especificaciones 063, 112, 113 y 116 describen a las docentes por su área o su caso, sin nombre.
- **FR-004**: `LICENSE` con la licencia MIT, Copyright (c) 2026 Samir Andrés Ardila Cabrera y Daniel Felipe Mora Rosas; sección «Licencia» en `README.md`.
- **FR-005**: No se reescribe el historial de Git: el cambio aplica a la versión actual (decisión del usuario).

## Criterios de éxito

- **SC-001**: Una búsqueda en `main` de correos `@gmail.com` personales, del teléfono y de los nombres de las docentes del piloto no devuelve resultados, salvo el correo público de contacto legal del proyecto.
- **SC-002**: Las pruebas de la encuesta docente siguen en verde.

## Fuera de alcance

- El correo de contacto legal del proyecto (`frontend/src/modules/legal/legalContent.ts`), que es público por diseño.
- Reescribir el historial de Git.
