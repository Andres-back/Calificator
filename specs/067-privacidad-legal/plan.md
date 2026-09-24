# Plan de implementación: base legal, privacidad y aceptación versionada

**Rama**: `codex/067-privacidad-legal` | **Fecha**: 2026-09-24 | **Spec**: [spec.md](./spec.md) | **Issue**: [#139](https://github.com/Andres-back/Calificator/issues/139)

## Resumen

Crear documentos legales públicos y accesibles, enlazarlos desde superficies públicas y autenticadas, y registrar de forma aditiva la aceptación de términos y privacidad para nuevas altas públicas. El servidor será la autoridad de versión; las cuentas históricas permanecen sin cambios.

## Contexto técnico

**Lenguajes**: Python 3.11 y TypeScript/React 18  
**Dependencias**: FastAPI, Pydantic, SQLAlchemy, Alembic, React Router, Tailwind  
**Almacenamiento**: PostgreSQL; nueva tabla aditiva de aceptaciones  
**Pruebas**: pytest, Vitest, Playwright y CI existente  
**Plataforma**: web responsive, producción en contenedores  
**Restricciones**: no bloquear cuentas históricas, no reescribir datos académicos, no prometer controles inexistentes, no cargar analítica no necesaria nueva  
**Escala**: cinco documentos públicos, un flujo de registro y enlaces globales

## Verificación constitucional

- Roles: los documentos son públicos; la aceptación solo se escribe dentro del alta pública.
- Integridad: no toca calificaciones ni evidencias existentes.
- Evolución: migración aditiva, columnas/tablas reversibles y sin backfill de aceptaciones.
- Accesibilidad: rutas navegables, encabezados semánticos, enlaces visibles y 360 px.
- IA segura: se informa el uso de proveedores sin exponer claves ni afirmar un proveedor fijo.
- Gobernanza: issue #139, spec/plan/tasks, aprobaciones, PR y CI.

## Diseño

```text
backend/
├── alembic/versions/202609240001_legal_acceptances.py
├── app/modules/legal/models.py
├── app/modules/legal/policy.py
├── app/modules/auth/{schemas.py,service.py}
└── tests/unit/test_legal_registration.py

frontend/src/
├── components/legal/{LegalFooter.tsx,LegalLayout.tsx}
├── modules/legal/{LegalPages.tsx,legalContent.tsx}
├── modules/auth/RegisterPage.tsx
├── config/{routes.ts,seo.ts}
└── router.tsx
```

## Decisiones

1. Guardar aceptaciones en entidad separada e inmutable, no en columnas sobrescribibles de usuario.
2. Versiones definidas por el servidor; el cliente solo expresa aceptación booleana.
3. No pedir dirección, edad, documento ni IP para demostrar aceptación: se minimizan datos.
4. No crear banner de consentimiento porque no se identificaron cookies publicitarias o analíticas; la política explica cookies necesarias y la medición Cloudflare sin estado cliente. Si cambia esta condición, el script no podrá cargarse antes del consentimiento aplicable.
5. No forzar una aceptación retroactiva a cuentas existentes en este cambio.
6. Separar consentimiento de servicio, autorización de menores y consentimiento de investigación.

## Riesgos y mitigaciones

- **Texto tomado como asesoría definitiva**: aviso de revisión jurídica e institucional pendiente.
- **Prometer eliminación o retención no implementada**: describir principios y canal de solicitud sin inventar plazos técnicos.
- **Registro manipulado**: validación obligatoria en servidor y transacción única.
- **Duplicidad futura**: unicidad por usuario, documento y versión.
- **Regresión de altas internas**: solo el endpoint público crea estas constancias; flujos administrativos continúan iguales.
