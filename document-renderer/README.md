# Conversión privada de documentos

Servicio interno DOCX → PDF para la digitalización visual de evaluaciones. No recibe rutas del host, direcciones externas ni credenciales: únicamente bytes de un documento validado. No tiene puertos publicados ni acceso al volumen de evidencias.

La configuración de Compose lo conecta solo a la red interna `document-rendering`; el worker de digitalización puede acceder al servicio. Se ejecuta con UID 10001, raíz de solo lectura, capacidades retiradas, sin privilegios nuevos, CPU limitada a 1, memoria máxima de 768 MB y 128 procesos. Los temporales de cada conversión se eliminan al terminar o fallar. Una conversión activa admite una sola petición; las restantes reciben un error recuperable.

Límites: entrada y PDF de salida de 20 MB; conversión de LibreOffice de hasta 45 segundos; expansión acumulada de paquetes de 80 MB y profundidad acotada. Se rechazan macros, DTD, campos activos y referencias externas, incluidos los paquetes de datos incrustados de gráficas. El backend vuelve a comprobar páginas, tamaño y representación después de convertir.

El validador compartido se copia desde `backend/app/modules/evaluaciones/document_archive.py` al construir la imagen. No hay una segunda implementación divergente dentro del conversor.

## Comprobación aislada

Desde la raíz del repositorio, con Docker disponible y las imágenes locales construidas:

```text
python document-renderer/check_isolation.py --image xcalificator-document-renderer --backend-image xcalificator-backend
```

La comprobación crea una red privada y un contenedor efímeros, genera documentos sintéticos, verifica las figuras y valores conservados, prueba el extractor completo, comprueba las restricciones y retira únicamente los recursos de prueba que creó. Su salida contiene contadores y tiempos, no documentos ni información personal.

La disponibilidad de este servicio no activa por sí sola la importación visual. La integración con trabajos persistentes, revisión docente, exportación y calificación debe completarse antes del despliegue autorizado.
