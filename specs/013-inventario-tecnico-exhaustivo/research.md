# Investigación: Inventario técnico exhaustivo

## Decisión 1 - Analizar fuentes sin importar la aplicación

**Decisión**: usar análisis sintáctico y reglas de texto acotadas sobre archivos versionados.

**Rationale**: importar la aplicación puede cargar configuración, inicializar modelos o requerir
servicios. La inspección estática funciona igual en Windows y CI y nunca necesita secretos.

**Alternativas consideradas**:
- OpenAPI en runtime: exacto para endpoints, pero requiere importar FastAPI y no cubre frontend ni jobs.
- Búsquedas con expresiones regulares solamente: simples, pero insuficientes para prefijos y anidamiento.
- Instrumentación productiva: descartada por privacidad y dependencia del despliegue.

## Decisión 2 - JSON canónico como contrato

**Decisión**: ownership, excepciones e inventario usan JSON UTF-8 con claves y listas ordenadas.

**Rationale**: Python lo soporta sin dependencias y permite comparar bytes en modo --check.

**Alternativas consideradas**:
- YAML: más amigable, pero añade parser y ambigüedad de tipos.
- Solo Markdown: legible, pero difícil de validar y consultar.
- Base de datos: innecesaria y contraria al alcance de desarrollo.

## Decisión 3 - Propiedad explícita con reglas por prefijo

**Decisión**: cada dominio declara patrones de fuente, ruta o identificador; exactamente una regla
debe poseer cada superficie. Los consumidores compartidos no cambian al propietario.

**Rationale**: la asignación explícita evita heurísticas silenciosas y permite revisar cambios.

**Alternativas consideradas**:
- Propiedad inferida únicamente por carpeta: falla en módulos compartidos.
- Propiedad múltiple: dificulta saber qué especificación actualizar.
- Sin configuración: no permite resolver ambigüedades.

## Decisión 4 - Permisos conservadores

**Decisión**: registrar por separado las guardas visibles y las dependencias del servidor. Cuando
el análisis no sea concluyente, usar estado ambiguo y exigir override o issue.

**Rationale**: asumir permisos puede ocultar accesos cruzados entre roles.

**Alternativas consideradas**:
- Inferir actor por nombre de módulo: demasiado débil.
- Probar usuarios reales: fuera de alcance y requiere datos.
- Omitir permisos: incumple el objetivo de seguridad.

## Decisión 5 - Artefactos versionados y deterministas

**Decisión**: current.json y los inventory.md por dominio se regeneran con --write y se comparan
con --check. No incluyen timestamps, rutas absolutas ni datos locales.

**Rationale**: el diff es revisable y dos ejecuciones sobre el mismo commit no generan ruido.

**Alternativas consideradas**:
- Generar solo en CI: los revisores no ven el cambio propuesto.
- Guardar fecha de generación: crea diferencias sin cambio funcional.
- No versionar resultados: impide navegación directa desde las specs.

## Decisión 6 - Excepciones temporales estrictas

**Decisión**: una excepción requiere id, superficie, justificación, responsable, issue y criterio
de cierre; no puede ocultar duplicados ni secretos.

**Rationale**: permite avanzar ante casos complejos sin normalizar deuda indefinida.

**Alternativas consideradas**:
- Lista global de exclusiones: no auditable.
- Fallar sin excepción posible: bloquea casos legítimos.
- Comentarios en código: dispersos y difíciles de validar.