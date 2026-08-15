from enum import StrEnum

class DemoEstado(StrEnum):
    ACTIVO = "activo"
    CERRADO = "cerrado"

class JobEstado(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"