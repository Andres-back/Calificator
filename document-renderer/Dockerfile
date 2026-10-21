FROM python:3.11-slim@sha256:a3ab0b966bc4e91546a033e22093cb840908979487a9fc0e6e38295747e49ac0

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-writer fonts-dejavu-core fonts-liberation \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 renderer \
    && useradd --uid 10001 --gid renderer --no-create-home --shell /usr/sbin/nologin renderer

WORKDIR /srv
COPY document-renderer/server.py ./server.py
COPY backend/app/modules/evaluaciones/document_archive.py ./document_archive.py
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp
USER 10001:10001
CMD ["python", "server.py"]
