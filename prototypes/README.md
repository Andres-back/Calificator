# XCalificator — Prototipos

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  
> Prototipos funcionales para validación de flujos de interacción con IA

Los prototipos son aplicaciones web independientes que validan flujos conversacionales antes de integrarlos al sistema principal. Cada prototipo tiene su propio servidor Python y HTML standalone.

## Prototipos disponibles

| Prototipo | Puerto | URL | Descripción |
|---|---|---|---|
| examen-chat | `:3099` | [ver](examen-chat/) | Asistente paso a paso para crear exámenes. Wizard de 6 pasos guiados con panel separado del chat histórico. Controles grandes (48px+), diseño para docentes mayores. Persiste conversaciones en SQLite local. |
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

## examen-chat — Detalle

### Flujo del wizard (6 pasos)

1. **Tema** — El docente escribe qué quiere evaluar
2. **Tipos de pregunta** — Selecciona tipos y cantidades (opción múltiple, V/F, abierta, selección múltiple, completar)
3. **Material de referencia** — Opcional: pegar texto o subir imagen/PDF
4. **Generación** — La IA produce las preguntas alineadas a los DBA de la materia
5. **Revisión** — Edita preguntas inline, marca respuestas correctas
6. **Creación** — Confirma y el examen se guarda en el sistema

### Características de UX

- **Wizard separado del chat**: los formularios activos se renderizan en un panel fijo, no como mensajes del chat. El historial del chat solo contiene conversación real.
- **Controles grandes**: inputs de 48px mínimo, botones con padding generoso, texto de 16-18px.
- **Barra de progreso**: indicador visual de 5 pasos con números y etiquetas.
- **Tarjetas colapsables**: los exámenes guardados en la sidebar se muestran colapsados (solo título y fecha). Al hacer clic se expanden mostrando cantidad de preguntas, tipos y fecha de creación, con botón "Editar".
- **Chat limpio**: botón 🗑️ para limpiar la conversación sin borrar exámenes guardados.
- **Persistencia**: las conversaciones se guardan en SQLite local y pueden reanudarse.
- **Tema oscuro**: esquema de colores consistente con XCalificator.

### Uso

```bash
cd prototypes/examen-chat
python3 server.py
# Abrir http://localhost:3099
```
