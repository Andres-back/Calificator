# Implementation Plan: Encuesta fiable y versionada

**Branch**: `codex/109-encuesta-envio-seguro` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

Importar solo encuesta-docente del commit desplegado 5d05751 sobre main, sin fusionar cambios académicos ajenos. Corregir firma y confirmación, reintento en memoria y diagnóstico LR-CR-01 5.0. Alcance y producción autorizados por el usuario, con ampliación metodológica del 2026-10-20, issue #226.

## Technical Context

Python 3.11 estándar, WSGI/Gunicorn, SQLite y JavaScript sin nuevas dependencias. Dos bases existentes y volumen conservado, sin migración ni cambios de claves. unittest, Node test runner, Playwright CLI WebKit/Chromium y build Docker. Peticiones acotadas a 20 segundos; sin APIs de IA.

## Constitution Check

CSRF, permisos, firma obligatoria, idempotencia y constancias intactos. Borradores solo en memoria. Consentimiento 5.0 informa duración del formulario. Issue, spec, plan y aprobación humana registrados; PR y CI antes de main/producción. Solo reiniciar encuesta-docente, no el sistema académico.

## Project Structure

- app.py: límites compartidos, contexto archivado 4.0, resumen privado y métricas opcionales.
- public/submission.js y app.js: validación, confirmación vinculada al paquete, reintento y estados.
- public/schema.json, settings.json: 24 preguntas de 5.0 (se sustituye rango por minutos y se añaden cinco ítems).
- public/admin.js y admin.html: recuentos por versión, CSV agregado y métricas no causales.
- versions/4.0-web-breve/: esquema, ajustes y consentimiento inmutables.
- tests/: regresión y persistencia sintéticas, nunca sobre la muestra real.

## Release and rollback

Tras CI/merge, snapshot privado y huellas antes de reconstruir únicamente encuesta-docente desde main. Conservar .env/volumen y etiqueta de imagen anterior. Comprobar publicación, recepción con base temporal de la misma imagen, resumen real de solo lectura y huellas. Si falla salud, recuperar imagen previa sin borrar datos. No declarar preprueba humana realizada.
