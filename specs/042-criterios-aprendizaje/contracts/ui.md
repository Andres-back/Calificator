# Contrato de experiencia

## Navegación

- La pestaña de materia cambia de “DBA” a **“Criterios de aprendizaje”**.
- Ruta canónica: `/app/materias/:materiaId/criterios`.
- `/app/materias/:materiaId/dba` redirige conservando la materia y muestra una sola vez el cambio de nombre.
- “Estándares oficiales (opcional)” vive dentro del editor; no ocupa una pestaña paralela.

## Lista

Cada tarjeta muestra título, estado (`Borrador`, `Procesando`, `Requiere revisión`, `Aprobado`, `Archivado`), versión, número de criterios, fuentes y usos. Acciones reales: abrir, crear versión, aplicar o archivar. No habrá botones decorativos.

Estados obligatorios: carga con esqueleto; vacío con “Crear criterios”; error con reintento; procesamiento con navegación libre y aviso persistente; éxito con destino claro.

## Editor guiado

### Entrada — ¿Cómo quieres empezar?

- Acción principal: **«Definir qué voy a evaluar»**.
- Opción 1: «Usar foto, PDF o material de clase» abre el selector de referencia.
- Opción 2: «Escribir lo que enseñé» salta directamente a la intención docente.
- Opción 3: «Usar criterios que ya tengo» vuelve a la lista de versiones aprobadas.
- Las opciones muestran una frase de resultado; no usan términos como snapshot, clave estable o versión esperada.

### Paso 1 — Material de referencia

- Agregar fotos/hojas, PDF, DOCX, texto, material existente o estándar oficial.
- Revisar, ordenar, rotar y eliminar fotografías antes de confirmar.
- Indicar privacidad de cada fuente. “Privado para el profesor” es el valor inicial.
- Permitir “Continuar sin material”.

### Paso 2 — ¿Qué y cómo quieres evaluar?

- Campo principal en lenguaje natural.
- Controles simples para grado, evidencia/modalidad y prioridades.
- Ejemplo contextual, no texto largo obligatorio.
- Acciones: “Crear manualmente” y “Proponer con IA”.

### Paso 3 — Criterios y rúbrica

- Tarjetas amplias reordenables con nombre, descripción observable, evidencia esperada, peso/puntaje y niveles.
- Añadir, duplicar, mover y eliminar.
- Mostrar suma de pesos en barra fija; bloquear aprobación si no es válida.
- Mostrar al lado de cada criterio la fuente/página que lo respalda y advertencias de cobertura.
- Mantener nombre, aprendizaje observable y evidencia esperada en la vista básica.
- Agrupar peso, fuentes y niveles dentro de «Configuración avanzada» y ofrecer «Distribuir automáticamente».

### Paso 4 — Revisar y aprobar

- Resumen de intención, fuentes, criterios, pesos y usos futuros.
- Texto inequívoco: “La IA propuso; tú decides”.
- Acción primaria “Aprobar criterios”; secundaria “Guardar borrador”.
- Una versión aprobada se muestra de solo lectura con “Crear nueva versión”.

## Integración con evaluación y recurso

- Selector opcional “Usar criterios guardados” muestra solo versiones aprobadas de la materia.
- Elegir una versión precarga rúbrica/criterios; el profesor revisa antes de generar o guardar.
- Las opciones “Generación libre” y “Crear criterios aquí” siguen disponibles.
- El snapshot aplicado se identifica por título y versión; nunca cambia en silencio.
- Al seleccionar una versión, se muestra una previsualización de sus criterios y se explica que la relación con las preguntas será propuesta para revisión docente.

## Transparencia en calificación

Por cada respuesta se muestra en el mismo bloque:

1. evidencia/respuesta detectada;
2. criterio aplicado;
3. puntaje máximo y otorgado;
4. explicación concreta;
5. procedencia del criterio y confianza/alerta relevante.

Si la evidencia no permite aplicar el criterio, se muestra “Revisión docente necesaria”; no se publica una nota automática.

Al cambiar puntos, el estado se sincroniza de forma comprensible: puntaje máximo = correcta, puntaje intermedio = parcial y cero = incorrecta. «Sin respuesta» continúa siendo una decisión explícita del profesor.

## Ayuda inicial

- La primera visita presenta un recorrido corto sobre crear, revisar, aplicar y consultar resultados.
- La ayuda se puede cerrar, no reaparece de forma forzada y queda disponible mediante «Ver guía».
- El recorrido señala acciones reales de la pantalla y omite pasos cuyos controles no estén disponibles por permisos.

## Accesibilidad y responsividad

- 360×800, 390×844, 768×1024, 1366×768 y 1920×1080 sin scroll horizontal.
- Paneles y modales usan el scroll de página o un único contenedor explícito, nunca zonas anidadas que capturen la rueda.
- Objetivos táctiles mínimos de 44×44 px, foco visible, etiquetas accesibles y orden de teclado lógico.
- Claro/oscuro con contraste WCAG AA; progreso no depende solo del color.
- En móvil, pie fijo solo para una acción primaria y una secundaria; no tapa campos ni mensajes.
