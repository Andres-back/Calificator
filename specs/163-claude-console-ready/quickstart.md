# Validación y entrega

## Verificación local

- Backend: 54 pruebas de conexiones/catálogo, todas HTTP simuladas; Ruff sin hallazgos.
- Frontend: 27 pruebas del panel, tarjeta Claude y conexión genérica; TypeScript, lint estricto, build y auditorías de acciones/recursos pasan.
- Revisión independiente: preservación del snapshot, prueba visual previa, aislamiento de clave y publicación concurrente, sin hallazgos pendientes.
- Convergencia: FR-001 a FR-005 y las cuatro aceptaciones cubiertas; no queda código por construir. CI y entrega son verificaciones operativas posteriores.
- Inventario técnico regenerado y baseline de specs actualizado.

No se usaron claves reales ni llamadas pagadas durante desarrollo. Las pruebas necesitan permiso de ejecución de temporales/socket interno de asyncio en Windows; las llamadas externas permanecen simuladas.

## Uso

1. Abrir IA y credenciales, Proveedores y claves.
2. En «Claude Console · Sonnet 5.5», introducir únicamente la clave.
3. Pulsar «Guardar clave y usar Sonnet 5.5». El botón indica que hará una prueba breve con una imagen ficticia, con costo acotado por el presupuesto de prueba.
4. Si la prueba es válida, la ruta calificacion.valoracion usa la nueva conexión y claude-sonnet-5-5. Las otras rutas y el respaldo existente se conservan.

Un fallo no activa la selección. Tras preparar una clave se puede reintentar sin escribirla de nuevo mientras permanezca el formulario abierto. Un conflicto de versión exige recargar.

## Entrega y recuperación

Fusionar mediante PR con CI verde. En producción, actualizar el checkout limpio de /etc/komodo/stacks/xcalificator/app únicamente al commit aprobado de main; construir backend y nginx antes de recrearlos y comprobar salud y recursos estáticos. Conservar las imágenes anteriores para recuperación. No migraciones ni cambios de configuración productiva sin la clave y prueba del usuario.

Las rutas siguen operativas con el modelo anterior hasta que el usuario complete el botón. La comprobación posterior de despliegue valida la presencia del formulario y salud de servicios; no afirma autenticación de Claude sin la clave.
