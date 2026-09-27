# Verificación rápida

1. Ejecutar las pruebas unitarias de descubrimiento, resolvedor y extracción visual.
2. Ejecutar la prueba de migración y la instantánea de configuración del trabajo.
3. Comprobar que el catálogo muestra GLM para funciones de texto y visión.
4. Comprobar que una extracción exitosa usa solo DeepSeek.
5. Simular una respuesta no usable y comprobar que el siguiente intento usa GLM.
6. Confirmar que verificación y revisión adicional resuelven a GLM en instalaciones no personalizadas.
7. Confirmar que una ruta modificada por administrador permanece intacta.

## Resultado

Completado: 53 pruebas enfocadas pasaron antes del cierre documental. La cascada mantiene DeepSeek como primario, selecciona GLM ante fallo, reconoce sus dos capacidades y preserva rutas administrativas personalizadas. El control final de gobernanza se ejecuta con las tareas cerradas.
