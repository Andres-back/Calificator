# Contrato de interacción: revisión progresiva

## Entradas y rutas

- Tarjeta de evaluación no borrador: «Calificar» con permiso de calificación; «Revisar notas» con lectura sin modificación. Destino: centro existente con evaluación y materia conocidas.
- Borrador: sin inicio de calificación. Publicar y editar siguen sus permisos y acciones independientes.
- Menú de materia: Evaluaciones es la entrada habitual. La pestaña Calificar solo se conserva como fallback para roles autorizados sin lectura de Evaluaciones.
- Rutas antiguas, enlaces de pendientes/PQRS/boletín y sus parámetros permanecen compatibles.
- Retorno: «Volver a evaluaciones» usa materia válida y permiso de lectura; si no existe ese permiso, retorno autorizado equivalente sin solicitar nuevas capacidades.

## Resumen

- Identidad, nota efectiva y estado visibles.
- Bloqueos/alertas importantes visibles con motivo breve y acceso al detalle; nunca ocultos por un panel cerrado.
- Criterios solo si existen valoraciones guardadas. Puntajes por pregunta no se renombrarán como rúbrica.
- Criterios históricos del pipeline se identifican como tales; no se presentan como recalculados tras un ajuste global. Un máximo rubricado no se etiqueta como porcentaje/peso si ese origen no quedó registrado.
- «Ver notas por respuesta» y «Ver evidencia» abren contenido dentro del mismo centro. Las acciones de nota siguen distinguiendo confirmar, ajustar, guardar y publicar.

## Detalle

- Lista compacta de preguntas/criterios: título/identificador, puntaje/máximo, estado y revisión necesaria.
- Selección: muestra el componente existente y su comparación de respuesta, motivo y evidencia.
- Editor: el mismo `GradeComponentEditor`, versión esperada y guardado actual; 0.7/1 no es un ajuste global de nota.
- Fórmula, fuentes, verificaciones, historial, referencias liberadas, retroalimentación y PQRS conservan sus controles bajo sección explícita, sin duplicar editores.

## Accesibilidad y estado

- Controles de despliegue con nombre claro, `aria-expanded`, `aria-controls` y foco visible; se enfoca el panel tras montarse/mostrarse.
- Controles principales de al menos 44 px, texto ajustable y contenido completo. Comparación corta sin altura fija; explicación larga sin recorte irrecuperable.
- Una barra fija no tapa guardar/cancelar ni bloquea el scroll táctil; no introducir panel alto pegado a la pantalla.
- Un cambio pendiente mantiene editor visible o solicita decisión explícita antes de plegar/cambiar contexto. No reiniciar por polling.

## Compatibilidad y efectos

- La variante compacta es docente y explícita. El consumidor estudiante conserva referencias restringidas y no recibe botones de edición.
- Sin permisos nuevos, rutas nuevas, endpoints nuevos, inferencias por apertura, recalificación histórica ni publicación automática.
- Los errores de lectura/archivo, datos históricos incompletos, conflicto y guardado fallido conservan las recuperaciones actuales.
