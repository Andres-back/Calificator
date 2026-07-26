# XCalificator — Frontend

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  
> Interfaz de usuario del sistema integral de apoyo académico basado en LLM

Frontend React 18 + Vite + TypeScript para XCalificator. Proporciona la interfaz de usuario para todos los módulos del sistema.

## Stack

- React 18 + TypeScript
- Vite (build tool)
- React Router v6
- Tailwind CSS
- Componentes UI personalizados

## Desarrollo

```bash
cd frontend
npm ci
npm run dev     # Servidor de desarrollo en :5173
```

## Módulos (frontend/src/modules)

| Módulo | Descripción |
|---|---|
| `auth/` | Login, registro, recuperación |
| `dashboard/` | Panel principal del docente |
| `materias/` | Gestión de materias y DBA |
| `evaluaciones/` | Creación y gestión de evaluaciones |
| `herramientas/` | Materiales didácticos generados por IA |
| `calificaciones/` | Calificación y boletín |
| `xali/` | Asistente IA conversacional |
| `reportes/` | Estadísticas y rendimiento |
| `presentaciones/` | Generación de presentaciones |
| `admin/` | Configuración del sistema |

## Build

```bash
npm run build   # Genera dist/ para producción
```
