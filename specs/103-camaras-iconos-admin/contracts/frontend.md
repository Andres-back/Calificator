# Contrato de comportamiento frontend

## Captura

- Entrada: contexto actual de entrega, preferencia efímera de cámara y callbacks existentes de aceptar/cerrar/subir.
- Salida nueva: elección de dispositivo comunicada al picker para la siguiente apertura mientras permanezca montado.
- Salida existente: una foto revisada y aceptada, vinculada al contexto vigente; nunca envío automático.
- Permiso inicial: vídeo sin audio; se enumera lo autorizado. Selección explícita: dispositivo elegido, sin orientación obligatoria adicional.
- Selector etiquetado «Cámara», activo identificado; opción «Actualizar cámaras». Nombres largos no ensanchan la pantalla.
- Preparación/cambio: captura deshabilitada; anterior detenido; respuestas obsoletas no afectan a la vigente.
- Foto en revisión: dispositivo congelado; actualizar dispositivos no borra ni sustituye la foto.
- Error/desconexión: mensaje comprensible y recuperación; hojas y orden conservados. Cierre/segundo plano/contexto distinto apagan cámara.
- No se cambia el contrato HTTP, límites, reemplazo, calidad, carga ni calificación existente.

## Administración

- Cuatro entradas ilustradas: Inicio, Usuarios, Roles y Correo; tres cabeceras identificadas: Usuarios, Roles y Correo.
- Mantener texto, accesibilidad, rutas y filtros de permisos; iconos decorativos no duplican el nombre accesible.
- Tres nuevos assets transparentes; fallo de carga conserva símbolo alternativo y rótulo.
- No cambiar CRUD, credenciales, roles, ajustes de correo ni controles pequeños de acciones/estado.

## Compatibilidad

360, 390 y 1440 px; temas claro/oscuro; foco y teclado; objetivos táctiles de al menos 44 px. Capacidades de cámara limitadas por navegador/permisos, con subida alternativa siempre disponible. Pruebas simuladas no se presentan como pruebas físicas.
