from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def import_models() -> None:
    from app.modules.dba import models as dba_models  # noqa: F401
    from app.modules.evaluaciones import models as evaluaciones_models  # noqa: F401
    from app.modules.imagenes import models as imagenes_models  # noqa: F401
    from app.modules.materias import models as materias_models  # noqa: F401
    from app.modules.matriculas import models as matriculas_models  # noqa: F401
    from app.modules.users import models as users_models  # noqa: F401
