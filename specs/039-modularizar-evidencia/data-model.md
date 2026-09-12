# Modelo de datos: Evidencia de calificación

Esta fase no crea ni modifica tablas. Documenta los objetos actuales que atraviesan el nuevo límite interno.

## Evidencia de entrega

- Identidad: identificador de la entrega existente.
- Ubicación persistida: referencia privada actual; nunca se devuelve directamente al cliente.
- Tipo: imagen o PDF consolidado.
- Páginas: una para imágenes y el total real para PDF, con máximo vigente de 20.
- Metadatos: modalidad, orden, rotaciones, nombres originales y secciones cuando corresponda.

## Vista de evidencia

- Entrada: ubicación validada y número de página autorizado.
- Salida: archivo original autorizado o PNG derivado para una página.
- Caché: clave formada por huella del archivo y número de página.
- Errores: no encontrada, exceso de páginas o contenido no visualizable.

## Transiciones preservadas

1. La entrega obtiene o conserva una referencia privada.
2. La respuesta serializable sustituye esa referencia por una ruta autorizada.
3. La visualización valida acceso antes de resolver el archivo.
4. El reemplazo guarda la nueva referencia y retira la anterior con tolerancia a fallos.

No cambian estados de entrega, calificación ni trabajo asíncrono.
