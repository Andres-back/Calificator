# Investigación y decisiones

## Solicitudes docentes

**Decisión**: adaptar el commit local no fusionado `1e936b3` en lugar de rehacer el flujo desde cero.

**Razón**: ya contiene registro seguro, transición atómica, protección del último administrador, auditoría e interfaz administrativa. Se portarán selectivamente sus piezas sobre `main` actual para no recuperar inventarios ni pruebas antiguas.

**Alternativas**: tabla independiente, rol inmediato o aprobación por correo. Se descartan por alcance, seguridad o dependencia externa.

## Landing pública

**Decisión**: página React estática con branding versionado y sin llamadas autenticadas.

**Razón**: evita el 401 esperado de `/auth/me` en visitantes, carga rápido y mantiene `/app` como frontera protegida.

## Mapas conceptuales

**Decisión**: normalización backend y diagrama SVG/HTML propio por niveles.

**Razón**: el contrato actual no justifica una librería de grafos y debe exportarse con el PDF existente. El texto equivalente preserva accesibilidad.

**Alternativas**: Mermaid, canvas o librería de auto-layout; se descartan por peso y exportación.

## Pruebas

**Decisión**: pruebas focalizadas durante implementación y suite completa solo en CI.

**Razón**: reduce tiempo y consumo sin renunciar a las puertas previas al merge.