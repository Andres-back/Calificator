# Modelo de datos

## Usuario

Campos aditivos:

- `email_es_interno`: distingue un identificador generado de un buzón verificado.
- `debe_cambiar_password`: bloquea el uso normal hasta reemplazar la clave temporal.

Reglas:

- El correo sigue siendo único.
- Una clave temporal siempre establece `debe_cambiar_password=true`.
- Cambiar o restablecer la clave incrementa la versión de autenticación e invalida sesiones.

## Lote de importación

- Identidad y materia.
- Docente propietario.
- Trabajo de reconocimiento asociado.
- Estado: `procesando`, `requiere_revision`, `listo`, `confirmando`, `confirmado`, `fallido`, `cancelado`.
- Huella del archivo y clave privada temporal.
- Conteos finales y marcas de tiempo.

Transiciones:

```text
procesando -> requiere_revision -> listo -> confirmando -> confirmado
     |               |              |             |
     +------------> fallido         +----------> fallido recuperable
                     |
                     +-----------> cancelado
```

No puede volver de `confirmado` a revisión. Un reintento devuelve el resultado ya materializado.

## Fila del lote

- Orden original.
- Nombre detectado y nombre confirmado.
- Confianza y motivo de advertencia.
- Decisión: `crear`, `omitir`, `ya_matriculado` o `resolver`.
- Usuario/matrícula resultantes, si existen.

Reglas:

- El nombre confirmado tiene entre 2 y 160 caracteres.
- Las filas `resolver` no permiten confirmar.
- No hay relación automática con una cuenta externa a la materia por coincidencia de nombre.

## Matrícula

Se reutiliza la entidad existente y su unicidad `(materia_id, estudiante_id)`. La confirmación reactiva una matrícula inactiva verificada o crea una activa; no duplica vínculos.

## Credencial temporal

No es una tabla persistente. Es una proyección efímera de confirmación:

- nombre;
- correo interno;
- contraseña temporal;
- estado de creación.

Solo el hash se conserva en Usuario. La proyección desaparece al abandonar la respuesta.
