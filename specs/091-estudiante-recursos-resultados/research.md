# Decisiones de diseño

## Proyección segura de actividades

- **Decisión**: reutilizar `build_student_activity_payload` de evaluaciones para contenido de actividades consultadas desde herramientas.
- **Razón**: el sanitizador genérico elimina claves con nombres de respuesta, pero no las letras dentro de `crucigrama.grid`. El constructor seguro ya reemplaza grilla por máscara y conserva pistas/longitud; emparejamiento ya tiene una proyección sin soluciones.
- **Alternativas**: ocultar «Ver solución» no protege el payload; mantener dos sanitizadores puede introducir divergencias.
- **Compatibilidad**: `material_pdf` consume `get_material_for_user`; por eso su renderizador debe aceptar el contenido seguro además del formato original docente/apoyo. No recuperar contenido crudo para una consulta estudiantil.

## Un lugar para responder y enviar

- **Decisión**: las actividades interactivas evaluativas enlazan el resolver existente desde el recurso; el apoyo conserva práctica.
- **Razón**: `StudentResourcePage` actualmente permite responder localmente, pero «Ir a entregar» navega a otro formulario sin transportar esas respuestas. Además `MatchingView` verifica por defecto aunque el servidor quite soluciones. El jugador del resolver ya deshabilita esa verificación y usa una máscara segura de crucigrama.
- **Alternativas**: duplicar el jugador y almacenamiento de borradores en Recursos aumenta riesgo de pérdida/desincronización; revelar claves para permitir verificación invalida la evaluación.

## Tarjeta estudiantil única

- **Decisión**: compartir la presentación de nota y acceso a explicación entre boletín general y de materia; conservar presentaciones docentes.
- **Razón**: hay dos implementaciones estudiantiles sin enlace al desglose. `BoletinItem` ya incluye `evaluacion_id`, nota/escala, estado, feedback y fecha; no hacen falta consultas nuevas por tarjeta ni endpoints.
- **Alternativas**: copiar etiquetas y estilos en ambos puntos vuelve a permitir inconsistencias; enviar al workspace docente rompería aislamiento.

## Ausencia no equivale a antigüedad

- **Decisión**: mostrar aviso neutral cuando la consulta devuelve null y error específico/reintento cuando falla.
- **Razón**: `GET /evaluaciones/:id/mi-desglose` devuelve null si no hay nota publicada, si no hay desglose o si no es publicable; no permite afirmar fecha histórica. El dato se limita al estudiante autenticado y se conserva esa protección.
- **Alternativas**: interpretar cualquier 404/500 como nota histórica inventa la causa; añadir estados públicos nuevos al endpoint no es necesario para estas correcciones.

No hay tecnologías nuevas ni decisiones técnicas desconocidas que requieran investigación externa. Se trabaja con contratos y componentes inspeccionados del repositorio.
