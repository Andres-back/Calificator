# Hotfix: calificacion visual rapida y terminal

**Rama**: `codex/023-calificacion-vision-rapida`
**Fecha**: 2026-08-26
**Estado**: Aprobado por solicitud explicita del usuario
**Issue**: [#33](https://github.com/Andres-back/Calificator/issues/33)

## Incidente

Una entrega real de una fotografia fue aceptada en 1.97 s y tomada por el worker en 705 ms,
pero el procesamiento duro 168.65 s y termino sin nota. La extraccion uso `qwen3.7-plus`, el
calificador intento `deepseek-v4-flash` y la recuperacion uso `deepseek-v4-pro`. Los dos ultimos
no produjeron un contrato de nota valido. Aun asi, el trabajo quedo marcado como exitoso.

## Requisitos

- **FR-001**: La ruta administrativa de calificacion por fotografia DEBE usar por defecto
  `deepseek-v4-flash-vision-exp` mediante OpenCode.
- **FR-002**: La configuracion del trabajo DEBE congelar por separado la ruta visual y la ruta
  de calificacion textual, sin mezclar modelos de otras funciones.
- **FR-003**: El orquestador DEBE respetar el modelo OpenCode seleccionado para cada etapa y
  mantener compatibilidad con snapshots anteriores.
- **FR-004**: Una salida sin `nota_sugerida` DEBE conservar evidencia y quedar reintentable, pero
  el trabajo NO DEBE declararse exitoso.
- **FR-005**: No se cancelara una solicitud aceptada por un limite artificial de espera.
- **FR-006**: Errores y telemetria NO DEBEN exponer evidencia, prompts, credenciales ni respuestas.
- **FR-007**: Calificaciones validas, revision humana, idempotencia y concurrencia existentes DEBEN
  permanecer sin cambios.

## Aceptacion

1. Un trabajo nuevo conserva snapshots `vision` y `grading` inmutables.
2. `deepseek-v4-flash-vision-exp` se usa en vision y, si esta configurado para calificacion,
   tambien en el desglose y verificacion textual.
3. Una calificacion valida termina en `success` y mantiene una sola Entrega y Calificacion.
4. Si ningun evaluador produce nota, el trabajo termina en `failed`, la entrega queda
   `requiere_reintento` y la evidencia permanece disponible.
5. Una configuracion anterior con snapshot plano sigue ejecutandose.
6. Las pruebas unitarias, integracion, lint, tipos y build aplicables permanecen verdes.

