# Plan de hotfix 043

Issue #86. Se traslada el diseño ya aprobado de 042 a un paquete independiente basado en main para preservar el resto del trabajo local. La pausa de aprobación del plan se omite conforme al hotfix constitucional; el usuario aprobó implementación y publicación mediante PR.

## Implementación y reversión

1. `useBodyScrollLock` mantiene tokens de consumidores y una sola captura de estilos/posición. Solo el último libera el documento; escucha cambios del media query y tolera StrictMode.
2. `Modal` y `AppShell` reutilizan el hook; el menú elimina inert al cambiar ruta o pasar a escritorio.
3. `RevisionGuide` elimina su max-height y overflow anidados; sigue el contenedor principal.
4. Pruebas en los cuatro archivos existentes correspondientes. No se modifican backend, migraciones, escala, calificación o publicación.
5. Verificar desde la rama aislada tipos, lint, pruebas y build; PR enlazado al issue con hotfix y spec-approved, CI verde y merge. Verificar el commit servido en producción. Reversión: revertir el PR mediante otro PR; no interviene datos.

## Constitución

Se preservan roles, notas, trabajos asíncronos y datos. No hay secretos ni evidencias reales en el parche. Se mantienen accesibilidad y main protegida. La propiedad funcional continúa en las bases de navegación y calificación; 043 es únicamente el registro del hotfix.

## Evidencia local previa

Validación del paquete aislado sobre main: 24 pruebas verdes en cuatro archivos (9 s), TypeScript y ESLint focal sin errores, construcción Vite verde (23,67 s). Se conserva el aviso previo de bundle superior a 500 kB; no es error de build. El inventario se regenera mediante su script oficial para actualizar huellas derivadas, sin modificar contratos. GitHub debe confirmar todos los controles requeridos antes del merge.

Chromium 390×844: desmontar panel y diálogo abierto después deja estilos originales vacíos y cero diálogos; rueda desplaza 500 px. Chromium 1366×768: rueda sobre RevisionGuide real desplaza el principal 600 px; guía con overflow visible y scrollTop 0. Ensayos aislados sin crear ni cambiar entidades del producto. La importación de dependencias coincide con Vite para evitar duplicar módulos por HMR.
