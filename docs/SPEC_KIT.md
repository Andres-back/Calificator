# Flujo de desarrollo con Spec Kit

XCalificator usa Spec Kit v0.16.3 como gobernanza obligatoria de desarrollo. Spec Kit no se ejecuta
en producción ni forma parte de las imágenes Docker.

## Preparación local

```powershell
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.16.3
specify check
specify integration status --json
```

Los skills oficiales `$speckit-*` están versionados en `.agents/skills`. Las plantillas locales
en español se encuentran en `.specify/templates/overrides`.

## Cambio normal

1. Crear un issue y una rama `codex/NNN-descripcion`.
2. Ejecutar `$speckit-specify` y `$speckit-clarify`.
3. Obtener la etiqueta `spec-approved`.
4. Ejecutar `$speckit-plan` y obtener `plan-approved`.
5. Ejecutar `$speckit-checklist`, `$speckit-tasks` y `$speckit-analyze`.
6. Implementar con `$speckit-implement`, ejecutar pruebas y `$speckit-converge`.
7. Abrir un PR con `Closes #N`; fusionar únicamente con CI verde.

Las tareas técnicas permanecen en `tasks.md`; no se usa `taskstoissues`.

## Hotfix

El PR y el issue llevan la etiqueta `hotfix`. Siguen siendo obligatorios `spec.md`, `plan.md`,
`tasks.md`, `spec-approved`, una prueba de regresión y CI. Se omite únicamente
`plan-approved`.

## Actualización de Spec Kit

La versión está fijada en v0.16.3. Actualizarla requiere su propio issue, especificación, rama y PR.