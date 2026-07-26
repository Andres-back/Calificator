# XCalificator — Prototipos

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  
> Prototipos funcionales para validación de flujos de interacción con IA

Los prototipos son aplicaciones web independientes que validan flujos conversacionales antes de integrarlos al sistema principal. Cada prototipo tiene su propio servidor Python y HTML standalone.

## Prototipos disponibles

| Prototipo | Puerto | URL | Descripción |
|---|---|---|---|
| examen-chat | `:3099` | [ver](examen-chat/) | Asistente para crear exámenes: bot que guía al docente en la selección de tipos y cantidades de preguntas, acepta material de referencia (texto/imagen), genera el examen y lo guarda en el sistema. Persiste conversaciones en SQLite local. |
| herramienta-chat | `:3100` | [ver](herramienta-chat/) | Asistente conversacional para generar otros materiales didácticos (guías, talleres, crucigramas, etc.) |

## Estructura

```
prototypes/
├── examen-chat/
│   ├── server.py       # Servidor HTTP con proxy al backend y SQLite local
│   └── index.html      # Frontend standalone (sin framework)
└── herramienta-chat/
    ├── server.py
    └── index.html
```

## Uso

```bash
cd prototypes/examen-chat
python3 server.py
# Abrir http://localhost:3099
```
