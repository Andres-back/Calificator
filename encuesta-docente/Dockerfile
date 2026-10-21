FROM python:3.11-slim@sha256:a3ab0b966bc4e91546a033e22093cb840908979487a9fc0e6e38295747e49ac0
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd -g 10001 encuesta && useradd -u 10001 -g encuesta encuesta \
    && mkdir /data && chown encuesta:encuesta /data
COPY --chown=encuesta:encuesta app.py measurement.py manage.py settings.json ./
COPY --chown=encuesta:encuesta public ./public
COPY --chown=encuesta:encuesta feedback ./feedback
COPY --chown=encuesta:encuesta versions/4.0-web-breve ./versions/4.0-web-breve
USER encuesta
EXPOSE 8092
CMD ["gunicorn", "app:create_application()", "--bind", "0.0.0.0:8092", "--workers", "1", "--threads", "4", "--timeout", "45", "--access-logfile", "/dev/null"]
