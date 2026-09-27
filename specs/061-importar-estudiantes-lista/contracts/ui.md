# Contrato de interfaz

## Puntos de entrada

- Tarjeta **Estudiantes** de la vista general de materia.
- Vista **Asistencia / Llamar a lista**.

Ambos abren el mismo componente y estado de importación.

Además ofrecen **Agregar estudiantes existentes**, con búsqueda por nombre o usuario de acceso y selección explícita para reutilizar cuentas de otras materias del docente.

## Pasos

1. **Fotografía**: tomar/subir una foto y explicar que aún no se crearán cuentas.
2. **Procesamiento**: estado persistente; puede cerrarse y continuar navegando.
3. **Revisión**: lista editable con orden, confianza, advertencia, omitir y añadir.
4. **Confirmación**: cuenta exacta de alumnos que se crearán/matricularán.
5. **Credenciales**: tabla de una sola visualización con copiar individual e imprimir/descargar en el dispositivo bajo advertencia.

## Estados obligatorios

- Carga, procesamiento, vacío, error recuperable, revisión, conflicto, éxito y cancelación.
- Una fila incierta nunca aparece como confirmada silenciosamente.
- En móvil, cada fila es una tarjeta; no se usa una tabla horizontal obligatoria.

## Acceso inicial del alumno

- Después de iniciar con clave temporal, solo puede ver la pantalla **Crea tu contraseña** y cerrar sesión.
- Al completarla, se renueva la sesión y entra al inicio estudiantil.
- El correo interno se etiqueta como “Usuario de acceso; no recibe correo”.
