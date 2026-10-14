# Investigación y decisiones

Fecha: 2026-10-14. Código main `ecc54a6` y documentación primaria. No se ejecutaron calificaciones ni instalación real.

## Retroalimentación

**Decisión**: lectura de ancho disponible y editor creciente explícito.
**Fundamento**: CalificacionesWorkspace mantiene adjFeedback y guardas, pero usa textarea rows=4 para leer/editar. Separar presentación conserva contrato.
**Alternativas**: más filas fijas sigue imponiendo recuadro; regenerar/recortar altera contenido fuera del alcance. Conservar también avisos provisionales guardados.

## Nota global y desglose

**Decisión**: explicar diferencia y pendientes sin cambiar cálculo.
**Fundamento**: breakdown_policy.calculate_formula suma puntos no nulos sobre máximos de todos los componentes. breakdown_service reemplaza sugerencia global por suma solo con cobertura completa, todos puntuados y sin decisión humana previa. Sugerida 2.5 y provisional 1.85 pueden coexistir; no prueba ajuste docente ni cuál es correcta.
**Alternativas**: reemplazar notas o imputar ceros definitivos a evidencia ilegible introduce una decisión no autorizada.

## Decimales

**Decisión**: quitar ceros redundantes y normalizar referencia dirty igual.
**Fundamento**: GradeComponentEditor usa String del decimal serializado y máximo toFixed(2), distinto de validación exacta. 0.625 → 0.63 puede exceder máximo y crear edición inexistente. Cero no es null.
**Alternativas**: redondeo fijo pierde precisión; normalización por tecla mueve cursor.

## Instalar o añadir al inicio

**Decisión vigente**: por aclaración del usuario, solo guía manual de acceso directo y detección standalone actual. Sin prompts/eventos de instalación ni offline/service worker.
**Fundamento local**: manifest, iconos y standalone existen; LandingPage deriva a /app en standalone. main.tsx elimina service workers por incidencia previa de interceptación/CSP. No hay listener ni botón actuales.
**Fundamento externo**: [MDN: activar instalación](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt) documenta beforeinstallprompt no estándar, actualmente Chromium, consumo único y appinstalled. [MDN: requisitos](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) distingue instalación/offline y no exige service worker universalmente. [Apple: sitio como app](https://support.apple.com/es-co/guide/iphone/iphea86e5236/ios) describe Safari → Compartir → Agregar a inicio. Consultado 2026-10-14; pasos varían por versión.
**Alternativas**: oferta beforeinstallprompt estudiada inicialmente y retirada por simplificación autorizada. APK/store/extensión es otro producto. Persistir «instalada» no acredita estado tras desinstalar.

## Validación

**Decisión**: fixtures/guías sintéticas, regresiones relevantes y CI requerido. Dispositivo físico separado cuando esté disponible.
**Fundamento**: evita datos reales y tokens IA. Chromium/WebKit no acreditan menú nativo ni instalación física.
**Alternativa**: recalificar casos reales añade efectos académicos sin verificar estos ajustes visuales.
