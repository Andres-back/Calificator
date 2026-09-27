# Especificación 049: auditoría npm estable en CI

**Rama**: `codex/049-reparar-npm-audit`  
**Issue**: [#97](https://github.com/Andres-back/Calificator/issues/97)  
**Tipo**: hotfix

## Contexto

Después de fusionar la retroalimentación animada, el trabajo frontend falló antes de ejecutar tipos, pruebas y compilación. npm 10 llamó al endpoint `audits/quick`, en retirada, y recibió `400 Invalid package tree`; el mismo lockfile puede instalarse y auditarse con el cliente moderno. El registro también puede responder temporalmente con errores 5xx de mantenimiento.

## Alcance

- Fijar una versión compatible y reproducible de npm en el trabajo frontend.
- Reintentar la auditoría ante fallos transitorios, manteniendo el fallo final si hay vulnerabilidades moderadas o superiores o si el servicio continúa indisponible.
- Conservar el `package-lock.json`, las versiones de dependencias y el comportamiento del producto.

## Requisitos funcionales

- **FR-001**: El CI DEBE usar una versión explícita de npm que consuma el endpoint moderno de auditoría.
- **FR-002**: La auditoría DEBE reintentarse como máximo tres veces. Si npm.org mantiene un 503, solo PUEDE continuar cuando la huella SHA-256 del lockfile coincida con la versión previamente auditada; cualquier vulnerabilidad, otro error o lock modificado DEBE fallar.
- **FR-003**: El hotfix NO DEBE cambiar dependencias, API pública, datos ni comportamiento funcional de XCalificator.
- **FR-004**: La gobernanza Spec Kit, la instalación reproducible y las verificaciones existentes DEBEN continuar operativas.

## Criterios de aceptación

1. `npm ci` instala desde el lockfile existente.
2. La auditoría usa npm 11.6.1 y no depende del endpoint `audits/quick` de npm 10.
3. Una vulnerabilidad que alcance el umbral `moderate` continúa haciendo fallar el trabajo.
4. Tras tres respuestas 503, solo se admite el lockfile de huella aprobada y se emite una advertencia visible.
5. Un lockfile distinto nunca puede usar esa excepción y hace fallar el trabajo.
6. No hay cambios en `package.json`, código de aplicación, contratos ni base de datos.
