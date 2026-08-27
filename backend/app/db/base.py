from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def import_models() -> None:
    from app.modules.analytics import models as analytics_models  # noqa: F401
    from app.modules.auth import models as auth_models  # noqa: F401
    from app.modules.asistencia import models as asistencia_models  # noqa: F401
    from app.modules.calificaciones import incidencia_models as incidencia_models  # noqa: F401
    from app.modules.calificaciones import breakdown_models as breakdown_models  # noqa: F401
    from app.modules.calificaciones import models as calificaciones_models  # noqa: F401
    from app.modules.dba import models as dba_models  # noqa: F401
    from app.modules.evaluaciones import models as evaluaciones_models  # noqa: F401
    from app.modules.imagenes import models as imagenes_models  # noqa: F401
    from app.modules.materias import models as materias_models  # noqa: F401
    from app.modules.matriculas import models as matriculas_models  # noqa: F401
    from app.modules.presentaciones import models as presentaciones_models  # noqa: F401
    from app.modules.rag import models as rag_models  # noqa: F401
    from app.modules.users import models as users_models  # noqa: F401
    from app.modules.xali import refuerzo_models as xali_refuerzo_models  # noqa: F401
    from app.modules.xali import student_resource_models as xali_student_resource_models  # noqa: F401
