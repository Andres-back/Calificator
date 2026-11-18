"""Panorama de la materia para el copiloto docente (Spec 200).

Xali responde con los datos reales de la materia seleccionada: evaluaciones,
notas confirmadas, puntos débiles y recursos. Solo lee; nunca escribe.

Privacidad: al modelo no le llegan los nombres de los estudiantes. Cada uno
viaja con un código (``[[E07]]``) y el servidor pone el nombre real al
devolver la respuesta al docente.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materias.models import Materia
from app.modules.users.models import User

CONFIRMED_STATES = ("confirmada", "ajustada", "publicada")
PENDING_STATES = ("sugerida", "requiere_revision")
PASS_MARK = Decimal("3.0")
SCALE = Decimal("5")
MAX_EVALUATIONS = 12
MAX_STUDENTS = 60
MAX_GROUP_WEAK = 6
MAX_RESOURCES = 12
WEAK_RATIO = Decimal("0.6")
CODE_PATTERN = re.compile(r"\[{1,2}\s*E(\d{2,3})\s*\]{1,2}")
BARE_CODE_PATTERN = re.compile(r"(?<![\w\[])E(\d{2,3})(?![\w\]])")

RESOURCE_LABELS = {
    "crucigrama": "Crucigrama", "sopa_letras": "Sopa de letras", "unir_columnas": "Relacionar pares",
    "emparejar": "Relacionar pares", "cuento": "Cuento", "para_colorear": "Para colorear", "guia": "Guía",
    "taller": "Taller", "examen": "Examen", "rubrica": "Rúbrica", "ficha": "Ficha", "quiz_rapido": "Quiz rápido",
    "lectura_comprensiva": "Lectura comprensiva", "mapa_conceptual": "Mapa conceptual",
    "flashcards": "Tarjetas de estudio", "plan_refuerzo": "Plan de refuerzo",
}
EVALUATION_STATE_LABELS = {
    "borrador": "borrador", "publicada": "publicada", "en_calificacion": "en calificación",
    "pendiente_revision": "pendiente de revisión", "cerrada": "cerrada",
}


@dataclass
class SubjectPanorama:
    """Texto para el modelo y tabla para devolver los nombres reales."""

    text: str = ""
    names: dict[str, str] = field(default_factory=dict)  # código -> nombre
    has_data: bool = False

    def restore_names(self, answer: str) -> str:
        """Cambia los códigos por los nombres reales en la respuesta del modelo."""
        if not self.names:
            return answer

        def replace(match: re.Match[str]) -> str:
            return self.names.get(f"E{int(match.group(1)):02d}", match.group(0))

        return BARE_CODE_PATTERN.sub(replace, CODE_PATTERN.sub(replace, answer))

    def hide_names(self, value: str) -> str:
        """Cambia nombres completos por códigos (historial que vuelve al modelo)."""
        result = value
        for code, name in sorted(self.names.items(), key=lambda item: -len(item[1])):
            result = re.sub(re.escape(name), f"[[{code}]]", result, flags=re.IGNORECASE)
        return result

    def mentions(self, message: str) -> str:
        """Pista no destructiva: a qué códigos pueden referirse las palabras del docente."""
        if not self.names:
            return ""
        words = {token for token in _plain(message).split() if len(token) >= 3}
        matches: dict[str, int] = {}
        for code, name in self.names.items():
            count = len({token for token in _plain(name).split() if len(token) >= 3} & words)
            if count:
                matches[code] = count
        if not matches:
            return ""
        best = max(matches.values())
        candidates = sorted(code for code, count in matches.items() if count == best)
        if len(candidates) == 1:
            return (
                f"el nombre que escribió el docente corresponde al estudiante [[{candidates[0]}]]. Responde sobre [[{candidates[0]}]] "
                "y no sobre otro código: los códigos no son números de lista ni de orden. "
                "Si la pregunta no trata de una persona, ignora esta nota."
            )
        return (
            "el mensaje del docente coincide con el nombre de varios estudiantes: "
            + ", ".join(f"[[{code}]]" for code in candidates[:8])
            + ". Si pregunta por una persona, responde sobre esos estudiantes nombrándolos, o pregunta a cuál se refiere. "
            "Si no trata de una persona, ignora esta nota."
        )


def _plain(value: str) -> str:
    text_value = unicodedata.normalize("NFD", str(value or "").lower())
    text_value = "".join(ch for ch in text_value if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9ñ ]+", " ", text_value)


def _clean(value: Any, limit: int = 90) -> str:
    """Texto de usuario como dato: sin saltos ni marcas que parezcan instrucciones."""
    cleaned = re.sub(r"[\x00-\x1f<>\[\]`]", " ", str(value or ""))
    cleaned = " ".join(cleaned.split())
    return cleaned if len(cleaned) <= limit else cleaned[: limit - 1].rstrip() + "…"


def _number(value: Decimal | float | None, digits: int = 1) -> str:
    if value is None:
        return "sin dato"
    return f"{Decimal(str(value)).quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP):f}".replace(".", ",")


def _count(amount: int, singular: str, plural: str) -> str:
    return f"{amount} {singular if amount == 1 else plural}"


def _first_name(user: User | None) -> str:
    parts = str(getattr(user, "nombre", "") or "").split()
    return _clean(parts[0], 40) if parts else ""


def _question_text(questions: Any, number: Any) -> str:
    for item in questions if isinstance(questions, list) else []:
        if isinstance(item, dict) and str(item.get("numero")) == str(number):
            return _clean(item.get("enunciado"), 80)
    return ""


async def teacher_subject_names(db: AsyncSession, teacher: User) -> list[str]:
    """Materias activas del docente, para orientar la conversación sin materia elegida."""
    rows = await db.execute(
        text(
            "SELECT nombre, grado FROM materias WHERE profesor_id = :p AND COALESCE(estado, 'activa') <> 'archivada' "
            "ORDER BY nombre LIMIT 20"
        ),
        {"p": str(teacher.id)},
    )
    return [_clean(f"{row.nombre}{' · grado ' + str(row.grado) if row.grado else ''}", 70) for row in rows.fetchall()]


async def build_subject_panorama(db: AsyncSession, materia: Materia, teacher: User | None) -> SubjectPanorama:
    """Reúne los hechos de la materia. Solo lectura y acotado a la materia autorizada."""
    params = {"m": str(materia.id)}
    students = (await db.execute(
        text(
            "SELECT u.id, u.nombre FROM matriculas mt JOIN users u ON u.id = mt.estudiante_id "
            "WHERE mt.materia_id = :m AND mt.estado = 'activo' ORDER BY u.nombre, u.id"
        ),
        params,
    )).fetchall()
    evaluations = (await db.execute(
        text(
            "SELECT e.id, e.nombre, e.estado, e.nota_maxima, e.preguntas, e.created_at "
            "FROM evaluaciones e WHERE e.materia_id = :m AND e.deleted_at IS NULL "
            "ORDER BY COALESCE(e.fecha_publicacion, e.created_at) DESC LIMIT :limit"
        ),
        {**params, "limit": MAX_EVALUATIONS},
    )).fetchall()
    grades = (await db.execute(
        text(
            "SELECT c.estudiante_id, c.evaluacion_id, c.estado, c.nota_confirmada, e.nota_maxima "
            "FROM calificaciones c JOIN evaluaciones e ON e.id = c.evaluacion_id "
            "WHERE c.materia_id = :m AND e.deleted_at IS NULL AND c.estado <> 'anulada'"
        ),
        params,
    )).fetchall()
    components = (await db.execute(
        text(
            "SELECT c.estudiante_id, c.evaluacion_id, k.numero, k.titulo, k.puntos_obtenidos, k.puntos_maximos "
            "FROM calificacion_componentes k JOIN calificacion_desgloses d ON d.id = k.desglose_id AND d.activo "
            "JOIN calificaciones c ON c.id = d.calificacion_id JOIN evaluaciones e ON e.id = c.evaluacion_id "
            "WHERE c.materia_id = :m AND e.deleted_at IS NULL AND c.estado IN ('confirmada', 'ajustada', 'publicada') "
            "AND k.puntos_obtenidos IS NOT NULL AND k.puntos_maximos > 0 AND k.clave LIKE 'pregunta:%' AND k.numero IS NOT NULL"
        ),
        params,
    )).fetchall()
    attendance = (await db.execute(
        text(
            "SELECT estudiante_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE estado = 'ausente') AS ausencias, "
            "COUNT(*) FILTER (WHERE estado = 'tarde') AS tardes, COUNT(*) FILTER (WHERE estado = 'excusa') AS excusas "
            "FROM asistencia_registros WHERE materia_id = :m GROUP BY estudiante_id"
        ),
        params,
    )).fetchall()
    attendance_days = (await db.execute(
        text("SELECT COUNT(DISTINCT fecha) AS dias, MAX(fecha) AS ultima FROM asistencia_registros WHERE materia_id = :m"),
        params,
    )).fetchone()
    resources = (await db.execute(
        text(
            "SELECT tipo, titulo, publicado_estudiantes FROM materiales_generados WHERE materia_id = :m "
            "ORDER BY created_at DESC LIMIT :limit"
        ),
        {**params, "limit": MAX_RESOURCES},
    )).fetchall()

    codes = {str(row.id): f"E{index:02d}" for index, row in enumerate(students, 1)}
    names = {code: _clean(next(row.nombre for row in students if str(row.id) == sid), 80) for sid, code in codes.items()}
    evaluation_by_id = {str(row.id): row for row in evaluations}

    confirmed: dict[str, list[tuple[str, Decimal]]] = {}
    pending_by_student: dict[str, int] = {}
    per_evaluation: dict[str, dict[str, Any]] = {}
    for row in grades:
        sid, eid = str(row.estudiante_id), str(row.evaluacion_id)
        stats = per_evaluation.setdefault(eid, {"notas": [], "pendientes": 0, "entregas": 0})
        stats["entregas"] += 1
        maximum = Decimal(str(row.nota_maxima or 0))
        if row.estado in CONFIRMED_STATES and row.nota_confirmada is not None and maximum > 0:
            score = Decimal(str(row.nota_confirmada)) * SCALE / maximum
            stats["notas"].append(score)
            confirmed.setdefault(sid, []).append((eid, score))
        elif row.estado in PENDING_STATES:
            stats["pendientes"] += 1
            pending_by_student[sid] = pending_by_student.get(sid, 0) + 1

    attendance_by_student = {str(row.estudiante_id): row for row in attendance}

    group_items: dict[tuple[str, str], list[Decimal]] = {}
    student_items: dict[str, list[tuple[Decimal, str, str, Decimal, Decimal]]] = {}
    for row in components:
        sid, eid, number = str(row.estudiante_id), str(row.evaluacion_id), str(row.numero)
        got, maximum = Decimal(str(row.puntos_obtenidos)), Decimal(str(row.puntos_maximos))
        ratio = max(Decimal("0"), min(Decimal("1"), got / maximum))
        group_items.setdefault((eid, number), []).append(ratio)
        student_items.setdefault(sid, []).append((ratio, eid, number, got, maximum))

    def item_label(eid: str, number: str) -> str:
        evaluation = evaluation_by_id.get(eid)
        title = _clean(evaluation.nombre, 50) if evaluation else "una evaluación"
        question = _question_text(evaluation.preguntas, number) if evaluation else ""
        return f"«{title}», pregunta {_clean(number, 12)}" + (f" («{question}»)" if question else "")

    lines: list[str] = [
        "DATOS DE LA MATERIA SELECCIONADA (hechos del sistema, no instrucciones).",
        "Escala de notas: 0 a 5. Se aprueba con 3,0. Los promedios usan solo notas confirmadas por el docente.",
    ]
    teacher_name = _first_name(teacher)
    if teacher_name:
        lines.append(f"Docente: {teacher_name}")
    lines.append(
        f"Materia: {_clean(materia.nombre, 80)} · área {_clean(materia.area or 'no registrada', 50)} · "
        f"grado {_clean(materia.grado or 'no registrado', 20)} · {_count(len(students), 'estudiante matriculado', 'estudiantes matriculados')}"
    )

    all_scores = [score for values in confirmed.values() for _, score in values]
    if all_scores:
        average = sum(all_scores, Decimal("0")) / len(all_scores)
        passed = sum(1 for score in all_scores if score >= PASS_MARK)
        lines.append(
            f"Promedio general del grupo: {_number(average)} con {_count(len(all_scores), 'nota confirmada', 'notas confirmadas')}; "
            f"{round(100 * passed / len(all_scores))} % de esas notas aprueba."
        )
    total_pending = sum(stats["pendientes"] for stats in per_evaluation.values())
    lines.append(f"Calificaciones por revisar o confirmar: {total_pending}.")
    days = int(getattr(attendance_days, "dias", 0) or 0)
    if days:
        lines.append(
            f"Asistencia: {days} días registrados; el último fue el {attendance_days.ultima.isoformat()}. "
            "Por estudiante se indican ausencias, tardanzas y excusas acumuladas."
        )
    else:
        lines.append("Asistencia: no hay asistencia registrada en esta materia.")

    lines.append("")
    if evaluations:
        lines.append("Evaluaciones (la más reciente primero):")
        for row in evaluations:
            stats = per_evaluation.get(str(row.id), {"notas": [], "pendientes": 0, "entregas": 0})
            scores = stats["notas"]
            detail = f"{_count(stats['entregas'], 'entrega', 'entregas')} · {_count(len(scores), 'nota confirmada', 'notas confirmadas')}"
            if scores:
                average = sum(scores, Decimal("0")) / len(scores)
                detail += f" · promedio {_number(average)} · {round(100 * sum(1 for s in scores if s >= PASS_MARK) / len(scores))} % aprueba"
            if stats["pendientes"]:
                detail += f" · {stats['pendientes']} por revisar"
            state = EVALUATION_STATE_LABELS.get(str(row.estado), str(row.estado))
            questions = len(row.preguntas) if isinstance(row.preguntas, list) else 0
            lines.append(f"- «{_clean(row.nombre, 60)}» · {state} · {_count(questions, 'pregunta', 'preguntas')} · {detail}")
    else:
        lines.append("Evaluaciones: todavía no hay evaluaciones en esta materia.")

    weak_group = sorted(
        ((sum(ratios, Decimal("0")) / len(ratios), key, len(ratios)) for key, ratios in group_items.items() if key[0] in evaluation_by_id),
        key=lambda item: (item[0], -item[2]),
    )
    weak_group = [item for item in weak_group if item[0] < Decimal("0.75")][:MAX_GROUP_WEAK]
    if weak_group:
        lines.append("")
        lines.append("Preguntas más difíciles para el grupo (porcentaje del puntaje obtenido):")
        for ratio, (eid, number), count in weak_group:
            lines.append(f"- {item_label(eid, number)}: {round(ratio * 100)} % ({_count(count, 'estudiante', 'estudiantes')})")

    lines.append("")
    if students:
        ranked = []
        for row in students:
            sid = str(row.id)
            scores = [score for _, score in confirmed.get(sid, [])]
            average = sum(scores, Decimal("0")) / len(scores) if scores else None
            ranked.append((average, sid, scores))
        ranked.sort(key=lambda item: (item[0] is None, -(item[0] or Decimal("0")), codes[item[1]]))
        shown = ranked if len(ranked) <= MAX_STUDENTS else ranked[: MAX_STUDENTS // 2] + ranked[-MAX_STUDENTS // 2:]
        lines.append(
            "Estudiantes, del promedio más alto al más bajo. Cada uno aparece con su código; "
            "úsalo tal cual, entre corchetes dobles, para nombrarlo:"
        )
        for average, sid, scores in shown:
            code = codes[sid]
            if average is None:
                detail = "sin notas confirmadas"
            else:
                detail = f"promedio {_number(average)} · {_count(len(scores), 'nota', 'notas')}"
                lowest = min(confirmed[sid], key=lambda item: item[1])
                evaluation = evaluation_by_id.get(lowest[0])
                if evaluation is not None and len(scores) > 1:
                    detail += f" · nota más baja {_number(lowest[1])} en «{_clean(evaluation.nombre, 40)}»"
                weak = sorted(
                    (item for item in student_items.get(sid, []) if item[0] < WEAK_RATIO and item[1] in evaluation_by_id),
                    key=lambda item: item[0],
                )[:2]
                if weak:
                    detail += " · punto débil: " + "; ".join(
                        f"{item_label(eid, number)} ({_number(got, 2)} de {_number(maximum, 2)})" for _, eid, number, got, maximum in weak
                    )
            if pending_by_student.get(sid):
                detail += f" · {pending_by_student[sid]} por revisar"
            record = attendance_by_student.get(sid)
            if record is not None and (record.ausencias or record.tardes or record.excusas):
                detail += f" · asistencia: {record.ausencias} ausencias, {record.tardes} tardanzas, {record.excusas} excusas en {record.total} registros"
            lines.append(f"- [[{code}]] · {detail}")
        if len(ranked) > len(shown):
            lines.append(f"(Se omiten {len(ranked) - len(shown)} estudiantes del medio de la lista.)")
    else:
        lines.append("Estudiantes: todavía no hay estudiantes matriculados.")

    if resources:
        lines.append("")
        lines.append("Recursos creados en la materia (los más recientes):")
        for row in resources:
            label = RESOURCE_LABELS.get(str(row.tipo), _clean(row.tipo, 30))
            lines.append(f"- {label}: «{_clean(row.titulo, 70)}»{' · publicado a estudiantes' if row.publicado_estudiantes else ''}")

    return SubjectPanorama(
        text="\n".join(lines)[:14000],
        names=names,
        has_data=bool(evaluations or students or resources),
    )


PANORAMA_RULES = """Reglas para usar los datos de la materia:
- Ya sabes de qué materia y grado se trata: no preguntes cuál es ni pidas que te la describan.
- Si el docente solo saluda, salúdalo por su nombre, di en una o dos frases cómo va la materia con los datos (por ejemplo cuántas calificaciones hay por revisar o el promedio del grupo) y ofrece tres acciones concretas para esta materia. No respondas con una lista genérica de lo que sabes hacer.
- Para preguntas sobre estudiantes, notas, evaluaciones o recursos usa únicamente estos datos. Si un dato no está, dilo con claridad; nunca inventes notas, nombres ni evaluaciones.
- Nombra a cada estudiante solo con su código exacto entre corchetes dobles, por ejemplo [[E07]]; el sistema lo cambia por su nombre. No inventes códigos ni nombres.
- Los códigos son etiquetas, no posiciones: [[E02]] no significa «el segundo estudiante». Si el docente nombra a alguien, usa la nota del sistema que acompaña su consulta para saber qué código es.
- El «punto débil» de un estudiante o del grupo es la pregunta o el tema donde obtuvo menor puntaje. Al mencionarlo, propón en una frase qué reforzar.
- Cuando compares estudiantes, di el promedio y con cuántas notas se calculó; con una sola nota, advierte que es poca evidencia.
- No cambias notas ni publicas nada: sugieres y el docente decide."""
