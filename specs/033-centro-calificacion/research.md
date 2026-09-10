# Investigación y decisiones de 033

Evidencia local, main 98159a2, 2026-09-09. No se verificó una sesión productiva durante este diseño.

| Evidencia | Implicación | Decisión |
|---|---|---|
| router.tsx conecta MateriaCalificar y Workspace; MateriaEvaluaciones tiene dos destinos | Carga/revisión separadas | Una acción Calificar y revisar |
| Workspace enlaza Calificar foto con materiasPara('calificar') | Pide materia ya conocida | Carga contextual |
| GradeBreakdown recorre todos los componentes | Lectura vertical extensa | Selector con detalle enfocado reutilizable |
| reviewWorkspaceV2 aparece solo en declaración | Bandera sin efecto | Cablear o retirar; verificar pantalla servida |
| openClaimGradeIds deriva de bandeja-docente y service.py limita a seis | Filtro omite otras PQRS | Resumen completo por evaluación |
| SolicitudRevisionCreate incluye componente/version, router no los transmite; servicio valida pero tampoco los entrega a crear_incidencia | Pérdida de asociación | Reparar ambos puntos; no inventar vínculo histórico |
| Desglose y componentes guardan bloqueos, cobertura, requiere_revision, estado y valoraciones | Hay señales comprobables | Priorizar vigentes, no confundir discrepancia histórica con bloqueo actual |
| CalificacionesPage, CalificarFotoPage, SalonPage sin consumidores hallados en frontend | Candidatos a retiro | Reconfirmar al retirar; conservar tourSteps.boletinTour y backend salón |

## Decisiones y alternativas

- Un centro con filtros y paneles contextuales; cinco pestañas independientes conservarían la separación mental.
- Proyección docente paginada frente a descargar 30 desgloses/PQRS/PDF para filtrar en cliente: evita N+1 y entrega datos mínimos.
- Conservar boletín como informe transversal; no obligar a visitarlo para finalizar una nota.
- No introducir otro evaluador de IA para detectar alertas; se aprovechan señales persistidas y reglas existentes.
- Componentes recreados al versionar: referenciar PQRS antigua y resolver clave estable comprobada, sin adivinar pregunta.

## Aclaración

Análisis de alcance, roles, datos/identidad, interacción, estados/errores, rendimiento, privacidad, dependencias, restricciones y terminología sin preguntas bloqueantes. Supuestos funcionales documentados en spec. Validación física Safari/Brave se registra separadamente.
