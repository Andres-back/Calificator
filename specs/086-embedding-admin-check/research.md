# Investigación

- Decisión: catálogo persistido para validación administrativa. Motivo: incluye `ollama_internal`; la lista legacy no. Alternativa descartada: añadir otra lista duplicada.
- Decisión: cliente institucional y validador vectorial existentes. Motivo: comprobar respuesta real y compatibilidad. Alternativa descartada: solo listar modelos o interpretar health del contenedor como éxito de embeddings.
- Decisión: texto sintético fijo y URL del despliegue. Motivo: no usar información académica ni direcciones arbitrarias.
- Decisión: mostrar «Servicio interno» antes de prueba y «Conexión comprobada» tras éxito. Motivo: no confundir credencial disponible con servicio observado. No persistir resultados ni ampliar observabilidad histórica en este hotfix.
- No hay dependencias nuevas ni incógnitas que requieran agentes de investigación.
