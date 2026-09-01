"""Catálogo controlado de permisos y matrices compatibles con los perfiles existentes."""
from __future__ import annotations

from dataclasses import dataclass

from app.shared.enums import UserRole


@dataclass(frozen=True, slots=True)
class PermissionDefinition:
    key: str
    module: str
    action: str
    label: str
    description: str
    risk: str = "normal"
    sort_order: int = 0


def _permission(
    module: str,
    action: str,
    label: str,
    description: str,
    *,
    risk: str = "normal",
    sort_order: int = 0,
) -> PermissionDefinition:
    return PermissionDefinition(
        key=f"{module}.{action}",
        module=module,
        action=action,
        label=label,
        description=description,
        risk=risk,
        sort_order=sort_order,
    )


PERMISSIONS: tuple[PermissionDefinition, ...] = (
    _permission("users", "read", "Consultar usuarios", "Ver usuarios, estado y solicitudes docentes.", risk="sensitive", sort_order=10),
    _permission("users", "create", "Crear usuarios", "Crear cuentas desde administración.", risk="sensitive", sort_order=11),
    _permission("users", "update", "Editar usuarios", "Editar datos, estado y acceso de otras cuentas.", risk="sensitive", sort_order=12),
    _permission("users", "delete", "Retirar usuarios", "Desactivar o eliminar cuentas según su impacto.", risk="critical", sort_order=13),
    _permission("roles", "read", "Consultar roles", "Ver roles, permisos, asignaciones e historial.", risk="sensitive", sort_order=20),
    _permission("roles", "manage", "Gestionar roles", "Crear, editar, duplicar, archivar y asignar roles.", risk="critical", sort_order=21),
    _permission("admin_settings", "manage", "Configuración administrativa", "Gestionar correo y parámetros institucionales.", risk="critical", sort_order=30),
    _permission("admin_ai", "manage", "IA institucional", "Gestionar proveedores, credenciales y rutas institucionales.", risk="critical", sort_order=31),
    _permission("ai_settings", "personal", "IA personal", "Gestionar proveedores y preferencias propias.", risk="sensitive", sort_order=32),
    _permission("subjects", "read", "Consultar materias", "Ver las materias permitidas por propiedad o matrícula.", sort_order=40),
    _permission("subjects", "create", "Crear materias", "Crear materias como docente.", sort_order=41),
    _permission("subjects", "update", "Editar materias", "Editar materias propias o administrables.", sort_order=42),
    _permission("subjects", "enroll", "Inscribirse en materias", "Unirse a una materia mediante código.", sort_order=43),
    _permission("dba", "read", "Consultar DBA", "Ver DBA oficiales y personalizados.", sort_order=50),
    _permission("dba", "manage", "Gestionar DBA", "Crear, editar o retirar DBA personalizados.", sort_order=51),
    _permission("attendance", "read", "Consultar asistencia", "Ver asistencia y reportes permitidos.", sort_order=60),
    _permission("attendance", "manage", "Gestionar asistencia", "Registrar y editar asistencia.", sort_order=61),
    _permission("evaluations", "read", "Consultar evaluaciones", "Ver evaluaciones accesibles.", sort_order=70),
    _permission("evaluations", "create", "Crear evaluaciones", "Crear o digitalizar evaluaciones.", sort_order=71),
    _permission("evaluations", "update", "Editar evaluaciones", "Editar preguntas, fechas y recepción.", sort_order=72),
    _permission("evaluations", "delete", "Eliminar evaluaciones", "Retirar evaluaciones respetando evidencia e historial.", risk="sensitive", sort_order=73),
    _permission("evaluations", "publish", "Publicar evaluaciones", "Asignar y controlar visibilidad o entregas.", sort_order=74),
    _permission("evaluations", "submit", "Resolver evaluaciones", "Responder o entregar evidencia como estudiante.", sort_order=75),
    _permission("resources", "read", "Consultar recursos", "Ver recursos propios o asignados.", sort_order=80),
    _permission("resources", "create", "Crear recursos", "Generar y guardar recursos educativos.", sort_order=81),
    _permission("resources", "update", "Editar recursos", "Modificar recursos guardados.", sort_order=82),
    _permission("resources", "delete", "Eliminar recursos", "Retirar recursos sin destruir historial evaluativo.", risk="sensitive", sort_order=83),
    _permission("resources", "assign", "Asignar recursos", "Publicar recursos como apoyo o actividad.", sort_order=84),
    _permission("presentations", "read", "Consultar presentaciones", "Ver y exportar presentaciones accesibles.", sort_order=90),
    _permission("presentations", "create", "Crear presentaciones", "Generar presentaciones educativas.", sort_order=91),
    _permission("presentations", "update", "Editar presentaciones", "Modificar contenido de presentaciones.", sort_order=92),
    _permission("presentations", "delete", "Eliminar presentaciones", "Retirar presentaciones propias.", risk="sensitive", sort_order=93),
    _permission("submissions", "read", "Consultar entregas", "Ver entregas dentro del contexto autorizado.", risk="sensitive", sort_order=100),
    _permission("submissions", "review", "Revisar entregas", "Solicitar reemplazos y resolver incidencias.", risk="sensitive", sort_order=101),
    _permission("grading", "read", "Consultar calificaciones", "Ver notas y explicaciones autorizadas.", risk="sensitive", sort_order=110),
    _permission("grading", "grade", "Calificar", "Crear o ajustar una calificación docente.", risk="sensitive", sort_order=111),
    _permission("grading", "publish", "Publicar calificaciones", "Hacer visible una nota al estudiante.", risk="sensitive", sort_order=112),
    _permission("gradebook", "read", "Consultar boletín", "Ver el boletín permitido.", risk="sensitive", sort_order=120),
    _permission("reports", "read", "Consultar reportes", "Ver reportes y analítica autorizada.", risk="sensitive", sort_order=130),
    _permission("xali", "use", "Usar Xali", "Acceder al asistente según el contexto académico.", sort_order=140),
)

PERMISSION_BY_KEY = {permission.key: permission for permission in PERMISSIONS}
ALL_PERMISSION_KEYS = frozenset(PERMISSION_BY_KEY)

# Las acciones mutables necesitan acceso de lectura al mismo contexto. Esta
# relación evita roles que pueden invocar una acción pero no abrir su módulo.
PERMISSION_DEPENDENCIES: dict[str, frozenset[str]] = {
    permission.key: frozenset({f"{permission.module}.read"})
    for permission in PERMISSIONS
    if permission.action not in {"read", "use", "personal", "manage"}
    and f"{permission.module}.read" in ALL_PERMISSION_KEYS
}
PERMISSION_DEPENDENCIES.update(
    {
        "roles.manage": frozenset({"roles.read"}),
        "dba.manage": frozenset({"dba.read"}),
        "attendance.manage": frozenset({"attendance.read"}),
        "submissions.review": frozenset({"submissions.read"}),
        "grading.grade": frozenset({"grading.read"}),
        "grading.publish": frozenset({"grading.read"}),
    }
)

STUDENT_DEFAULT_PERMISSIONS = frozenset(
    {
        "subjects.read",
        "subjects.enroll",
        "dba.read",
        "evaluations.read",
        "evaluations.submit",
        "resources.read",
        "presentations.read",
        "grading.read",
        "gradebook.read",
        "xali.use",
    }
)

PROFESSOR_DEFAULT_PERMISSIONS = frozenset(
    {
        "subjects.read", "subjects.create", "subjects.update",
        "dba.read", "dba.manage", "attendance.read", "attendance.manage",
        "evaluations.read", "evaluations.create", "evaluations.update", "evaluations.delete", "evaluations.publish",
        "resources.read", "resources.create", "resources.update", "resources.delete", "resources.assign",
        "presentations.read", "presentations.create", "presentations.update", "presentations.delete",
        "submissions.read", "submissions.review",
        "grading.read", "grading.grade", "grading.publish", "gradebook.read",
        "reports.read", "xali.use", "ai_settings.personal",
    }
)

DEFAULT_PERMISSIONS_BY_ROLE = {
    UserRole.ADMIN.value: ALL_PERMISSION_KEYS,
    UserRole.PROFESOR.value: PROFESSOR_DEFAULT_PERMISSIONS,
    UserRole.ESTUDIANTE.value: STUDENT_DEFAULT_PERMISSIONS,
}


def default_permissions_for_role(role: str) -> frozenset[str]:
    return DEFAULT_PERMISSIONS_BY_ROLE.get(role, frozenset())
