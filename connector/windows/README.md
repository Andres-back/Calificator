# Conector Ollama local para Windows

Este programa permite que un docente use los modelos instalados en su propio computador sin publicar Ollama en Internet. El conector inicia todas las conexiones hacia XCalificator y, por defecto, llama a `http://127.0.0.1:11434/api` dentro del equipo.

## Vinculación

1. Instala Ollama y confirma que funciona localmente.
2. En **Mi configuración de IA > Ollama local**, genera un código temporal.
3. Ejecuta el conector, indica la URL HTTPS de XCalificator y escribe el código.
4. El token del dispositivo se guarda cifrado con Windows DPAPI para el usuario actual.
5. Inicia el conector. Los modelos disponibles aparecerán en la plataforma.

Si Ollama escucha en otro puerto local, indícalo al vincular el equipo. Solo se
admiten `127.0.0.1`, `localhost` o `::1`; el conector rechaza direcciones de red:

```powershell
XCalificatorOllamaConnector.exe pair --server https://xcalificator.daimuz.com --code XXXX-XXXX-XXXX --ollama-url http://127.0.0.1:11435
```

El código caduca en diez minutos y se usa una sola vez. Revocar el equipo desde XCalificator invalida inmediatamente su token.

## Alcance de privacidad

La primera versión solo permite elegir Ollama local para **Presentaciones**. El
conector no recibe fotografías, PDF, entregas, respuestas ni calificaciones de
estudiantes. Digitalización, visión y calificación continúan usando proveedores
Cloud autorizados. Esta separación es intencional y no se puede cambiar desde
la interfaz.

## Seguridad

- No abras ni redirijas el puerto local de Ollama en el router o firewall.
- El conector rechaza servidores sin HTTPS; HTTP solo está disponible para pruebas explícitas en localhost.
- Las claves de proveedores Cloud no pasan por el conector.
- Los trabajos llevan lease renovable. Un resultado duplicado no crea una segunda calificación.
- El conector no imprime prompts, respuestas, tokens ni evidencias en consola.

## Desarrollo local

```powershell
python -m xcalificator_ollama_connector.main pair --server http://127.0.0.1:8000 --allow-http-localhost --code XXXX-XXXX-XXXX --ollama-url http://127.0.0.1:11435
python -m xcalificator_ollama_connector.main run
```

La selección de Ollama local se habilita únicamente cuando el backend puede suspender y reanudar el trabajo original sin ocupar un worker. Vincular un equipo por sí solo no cambia la ruta de IA activa.

## Empaquetado

Una compilación local de validación debe declararse de forma explícita y nunca
distribuirse:

```powershell
.\installer\build.ps1 -AllowUnsignedDevelopment
```

Una compilación distribuible exige un certificado de firma de código instalado
en el almacén personal del usuario actual. El script comprueba clave privada,
uso extendido de firma, firma final y genera el SHA-256 del ejecutable:

```powershell
.\installer\build.ps1 -CertificateThumbprint TU_HUELLA
```
