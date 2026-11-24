# Plan: En «Ingresar», el pie legal no queda encima de la tarjeta

**Spec**: [spec.md](spec.md) | **Issue**: [#454](https://github.com/Andres-back/Calificator/issues/454)

## Decisión

Solo frontend, un archivo: `frontend/src/modules/auth/LoginPage.tsx`.

- El contenedor de la página pasa a ser una columna flexible de alto mínimo de pantalla.
- El contenido (`<main>`) ocupa el espacio disponible y deja de reservar 80 px fijos para el pie.
- El pie legal deja de ser `absolute` y va después del contenido, como en registro y recuperación de contraseña. Así no depende de cuántos renglones ocupen los enlaces ni del tamaño de letra.
- En pantallas estrechas el contenido empieza 80 px abajo, debajo del botón de tema (que mide 44 px y está a 20 px del borde). Desde 640 px la tarjeta ya no llega al botón y el margen vuelve a 40 px.

## Alternativa descartada

Aumentar el espacio reservado en celular. Se rompe de nuevo con letra más grande o con un sexto enlace.

## Riesgos

- En celular la página es más alta que la pantalla y los enlaces legales quedan al desplazar. El botón «Iniciar sesión» sigue en la primera pantalla.
- Sin migraciones, sin IA y sin cambios en el servidor.

## Verificación

Prueba de extremo a extremo en `frontend/e2e/auth-navigation.spec.ts` y capturas en claro y oscuro. Ver [quickstart.md](quickstart.md).
