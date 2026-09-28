# Contrato de registro público

`POST /api/auth/register`

Campos existentes:

- `nombre`
- `email`
- `password`
- `solicitar_docente`

Campos nuevos obligatorios:

- `acepta_terminos: true`
- `acepta_privacidad: true`

El cliente no envía versiones. El servidor registra las versiones vigentes y rechaza `false`, ausencia o valores no booleanos con validación 422. La respuesta no expone constancias ni cambia el contrato de usuario autenticado.
