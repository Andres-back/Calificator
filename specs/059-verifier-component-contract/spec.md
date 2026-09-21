# Especificación: revisión fiable de discrepancias por pregunta

**Rama**: `codex/059-verifier-component-contract` | **Creada**: 2026-09-21 | **Estado**: Aprobado como hotfix | **Issue**: [#117](https://github.com/Andres-back/Calificator/issues/117)

## Incidente y escenario

En la evaluación matemática demo, el enunciado de la pregunta 3 pide la altura `h`, la evidencia muestra `h²=525` y `h≈22,91 cm`, y la clave guardada dice `525`. El evaluador principal asignó cero; el verificador independiente señaló que ese cero era incompatible, pero la revisión mostró la pregunta como “Incorrecta” segura. El formato compacto del verificador usa `componente_id` y `puntos_obtenidos`, mientras el consumidor espera `clave` y `puntaje`.

Como docente, necesito ver una discrepancia real entre evaluadores o entre enunciado y clave como caso pendiente, sin un cero presentado como certeza, para revisar la evidencia y decidir la nota justa.

## Requisitos funcionales

- **FR-001**: La valoración compacta del verificador DEBE asociarse al identificador de pregunta esperado y convertir su puntaje al formato interno; identidades desconocidas NO DEBEN ingresar al desglose.
- **FR-002**: Una diferencia material de puntaje o estado entre evaluadores DEBE dejar el componente pendiente de revisión, sin promedio que simule una certeza.
- **FR-003**: Si una alerta del verificador identifica una pregunta y contradice explícitamente su puntaje o clave, esa pregunta DEBE quedar pendiente sin un cero definitivo, aun si los dos componentes recibidos dicen cero.
- **FR-004**: Una alerta benigna de redondeo y una coincidencia objetiva comprobada NO DEBEN convertirse en error por una regla heurística de conflictos.
- **FR-005**: El docente conserva la decisión final y no se publica automáticamente. Deben existir regresiones y un reensayo con la fotografía demo.

## Aceptación

1. El JSON `componente_id: pregunta:3, puntos_obtenidos: 0.83` produce un componente interno con `clave: pregunta:3, puntaje: 0.83`.
2. Un 0 contradicho por la alerta «P3 marcada incorrecta ... puntaje 0 incompatible» muestra la pregunta 3 como pendiente de revisión, nunca “Incorrecta” segura.
3. Un aviso de aproximación aceptable en la pregunta 1 no bloquea por sí solo su puntaje.
4. La reejecución no confirma ni publica la nota y conserva la fotografía y el historial.

## Alcance

No cambia la clave guardada de la evaluación ni inventa una respuesta correcta. No añade llamadas de IA, migraciones, proveedores ni endpoints. La inconsistencia de contenido se comunica al docente para corrección humana.
