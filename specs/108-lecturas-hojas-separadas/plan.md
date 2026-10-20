# Implementation Plan: Lecturas en hojas separadas

**Branch**: `codex/108-lecturas-hojas-separadas` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md) | **Issue**: #224

**Estado**: plan aprobado por el usuario el 2026-10-20 («Sí, apruebo el plan de lecturas»). Implementación local tras tareas/análisis; sin despliegue.

Ampliación de generación aprobada el 2026-10-20 mediante «Sí, apruebo esta ampliación». Implementación local tras actualizar tareas/análisis; sin despliegue automático.

## Propuesta de ampliación: cuento real y control de extensión

1. Reforzar el contrato del generador de cuento: estructura narrativa, personajes consistentes, no duplicación, extensión orientativa por longitud y moraleja según elección docente. Compatibilidad de campos antiguos; no reescribir cuentos guardados.
2. Validar estructura, repetición y páginas reales antes de aceptar una generación nueva. Contar el bloque narrativo con título/ilustración/moraleja, no las preguntas. Corto: una página; medio/largo: una o dos. No recortar ni encoger letra para forzar el límite.
3. Si falla la salida textual, como máximo una corrección acotada; si sigue inválida, mostrar revisión/error claro. No generar ilustraciones para textos ya rechazados ni introducir reintentos ilimitados.
4. Preparar la ilustración desde la historia aceptada y una escena anclada en ella, no solo título/tema o dos párrafos iniciales cuando el hecho principal ocurre después. Mantener calidad low y configuración administrativa; registrar fallo explícito y permitir revisión docente de correspondencia.
5. Pruebas simuladas de límites/repetición/moraleja/imagen fallida, más una generación real sintética autorizada con la API existente. Usa adaptadores existentes y código candidato solo en memoria de un proceso aislado; no despliega archivos ni persiste materiales académicos. No equivale a E2E de cola/UI ni prueba general de calidad.
6. Preservar históricos, añadir pruebas PDF y revisar en celular/escritorio. Nuevos requisitos FR-010..014 y SC-006..008 requieren tareas y Analyze actualizados antes de implementación.

## Summary

Presentar título, ilustración y narración en orden vertical. Iniciar preguntas numeradas en página nueva y reservar renglones según extensión esperada. Reutilizar exportación y permisos actuales, sin regenerar recursos ni activar importación visual.

## Technical Context

**Language/Version**: Python 3.11; TypeScript y React existentes.
**Primary Dependencies**: render HTML/CSS a PDF mediante WeasyPrint existente; vistas de recursos y visor actuales.
**Storage**: sin tablas, migraciones ni escritura sobre recursos; presentación derivada.
**Testing**: pytest para HTML/datos y PDF real; Vitest y Playwright para vistas y controles.
**Target Platform**: PDF Carta actual; navegador desde 360 px hasta escritorio, Chromium/WebKit.
**Project Type**: web/API.
**Performance Goals**: exportar sin llamadas de IA; generación nueva con como máximo dos intentos textuales y una imagen, sin imágenes para textos rechazados. Validación de paginación en hilo de trabajo, sin bloquear el event loop.
**Constraints**: preservar históricos completos y permisos; no enviar soluciones al alumno. Solo cuentos nuevos: una página corta o hasta dos para medio/largo, medida con WeasyPrint y reserva máxima de ilustración antes de gastar en ella.
**Scale/Scope**: dos tipos de recurso, cuentos y lecturas comprensivas; formato existente, sin Word nuevo.

## Constitution Check

- I: conservar puertas de soluciones/permisos y probar separación alumno/docente.
- II/IV: render puro; comparar recursos antes/después, no alterar datos académicos.
- III: reutilizar exportación actual, sin nuevas inferencias ni trabajo bloqueante adicional.
- V: vista adaptable, texto legible e impresión sin recortes; probar 360/390/1280 px y ambos temas.
- VI: no proveedores/credenciales nuevos.
- VII: especificación y plan aprobados, checklist 16/16; tareas y análisis antes de implementar.
- VIII: rama/issue propios y posterior PR/CI; sin cambios directos de producción.

Puertas de diseño revisadas antes/después: sin excepciones. Validación de código pendiente.

## Project Structure

Documentación en `specs/108-lecturas-hojas-separadas/`: spec, plan, research, data-model, quickstart, contracts y checklist. Tareas se generarán tras aprobar plan.

Superficies: `backend/app/modules/herramientas/pdf_render.py`, `generators/cuento.py`, nuevo `story_quality.py`, `schemas.py` y `service.py`; pruebas en `backend/tests/unit/`; vistas StoryContent/ContenidoView y formulario de cuento. Campo opcional `moraleja` automático/con/sin compatible con clientes anteriores. Controles de estructura/repetición y páginas no certifican coherencia semántica; revisión humana explícita.

## Secuencia prevista

1. Pruebas de regresión con recursos sintéticos nuevos/antiguos, imágenes y preguntas breves/largas.
2. Helper de numeración/espacio: 2 renglones breve, 4 explicación, 3 sin metadatos; contemplar enunciado y respuesta esperada solo dentro del servidor autorizado. No deducir respuesta mediante IA. Valores no válidos reciben fallback seguro.
3. Estilos acotados a estos dos tipos: narración en bloque vertical, imagen proporcionada y salto antes del cuestionario solo si hay preguntas; mantener enunciado con primer renglón y permitir continuación de bloques largos.
4. Alinear vistas de cuento/lectura con el orden aprobado y reutilizar visor completo existente; no introducir papel de ancho fijo en celular ni renglones gigantes en la vista web.
5. Render PDF real y revisar páginas de muestras cortas/largas, ausencia de páginas vacías/soluciones y conservación de texto. Probar UI y controles en dos motores y temas.
6. Ejecutar gobernanza, calidad y CI aplicables; documentar resultados, preparar PR sin afirmar despliegue.

## Complexity Tracking

Sin excepciones ni nuevas dependencias. Fuera de alcance importación visual de Spec 101, datos de alumnos y cambios globales de modelos. La ilustración de cuentos se prueba con el generador configurado, sin reintentos pagados automáticos en el ensayo real.

## Mantenimiento de CI autorizado

El usuario solicita «repáralo y vuelve a enviar CI» tras el fallo de auditoría en el PR #225. Resolver el aviso alto GHSA-q3jh-wrc6-jgq8 / GHSA-8r9p-f939-6h3c actualizando solo `follow-redirects` 1.16.0 → 1.16.1 dentro del rango existente de Axios. No ejecutar `audit fix --force`, no actualizar KaTeX con cambio incompatible, no rebajar umbrales ni renovar el hash de excepción 503 para saltar controles. Probar auditoría, instalación reproducible, sesión/API y build; reenviar CI con el nuevo HEAD y conservar bloqueo de fusión hasta controles verdes.
