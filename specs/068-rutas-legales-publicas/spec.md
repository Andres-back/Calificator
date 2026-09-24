# Hotfix: rutas legales realmente públicas

**Rama**: `codex/068-rutas-legales-publicas`
**Creada**: 2026-09-24
**Estado**: Aprobado por el usuario
**Issue**: [#141](https://github.com/Andres-back/Calificator/issues/141)

## Impacto y reproducción

Las cinco páginas legales compiladas en producción intentaban cargar la sesión porque `AuthBootstrap` no las reconocía como públicas. Sin sesión, las respuestas 401 activaban la recuperación, terminaban en `/login?reason=session-expired` e impedían consultar los documentos antes del registro.

1. Abrir `/privacidad` en una sesión nueva.
2. Observar `Iniciando XCalificator…`.
3. Comprobar la redirección no solicitada al login.

## Requisitos

- **FR-001**: `/privacidad`, `/terminos`, `/cookies`, `/aviso-privacidad` y `/piloto` DEBEN renderizarse sin solicitar `/auth/me` ni `/users/me/authorization`.
- **FR-002**: Las rutas bajo `/app` DEBEN conservar la autenticación y los permisos existentes.
- **FR-003**: Una prueba de regresión DEBE verificar cada ruta legal pública de forma independiente.

## Criterios de aceptación

1. Un visitante sin cookies puede abrir los cinco documentos y permanecer en la URL solicitada.
2. El bootstrap no ejecuta `fetchMe` en esas rutas.
3. `/app` sigue redirigiendo al login cuando no hay sesión.
4. No se modifican usuarios, consentimientos, notas, entregas ni migraciones.

## Causa y solución

La causa es una lista explícita de rutas públicas incompleta en `RequireAuth.tsx`. La solución añade las rutas legales ya declaradas en `routes.ts` y amplía la prueba parametrizada del bootstrap. No se relaja el interceptor HTTP ni la protección de rutas privadas.
