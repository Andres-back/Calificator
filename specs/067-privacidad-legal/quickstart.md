# Validación rápida

1. Abrir `/privacidad`, `/terminos`, `/cookies`, `/aviso-privacidad` y `/piloto` sin sesión.
2. Confirmar versión, fecha, responsable, canal, derechos, menores, IA y separación del estudio.
3. Abrir `/registro`; comprobar dos casillas vacías con enlaces independientes.
4. Enviar sin aceptar: el botón/cliente impide continuar y el endpoint rechaza una petición manipulada.
5. Aceptar y registrar: comprobar usuario y dos constancias con versión del servidor.
6. Migrar una base con usuarios existentes: comprobar que no se crean constancias retroactivas ni cambian roles/estado.
7. Revisar portada, login, recuperación y aplicación autenticada a 360×800 y 1366×768.
8. Ejecutar pruebas focalizadas, tipos, lint, inventario, gobernanza y CI.

## Control operativo previo a producción

- Confirmación de nombres y canal por ambos investigadores.
- Revisión por institución/asesor jurídico del rol de responsable y encargado.
- Autorización institucional y del representante legal para datos de menores.
- Consentimiento y asentimiento específicos del estudio, separados del registro.
- Revisión de términos y ubicación/retención de cada proveedor de IA habilitado.
