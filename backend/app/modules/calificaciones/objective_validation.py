"""Conservative, provider-independent adjudication of a single objective mark."""

from collections import defaultdict
from math import isfinite
import re
import unicodedata

from app.modules.calificaciones.breakdown_policy import canonical_key

_OBJECTIVE = {"opcion_multiple", "verdadero_falso"}
_IDS = ("clave", "question_id", "pregunta_id", "contenido_id", "id")
_NUMBERS = ("question_number", "pregunta", "numero")
_KEY_FIELDS = ("respuesta_correcta", "respuesta_esperada", "respuesta", "answer", "texto")
_PHOTO_MIN_CONFIDENCE = 0.85
_LETTER = re.compile(r"^([a-d])(?:\s*[).:\-]\s*(.+))?$")
_MARK = re.compile(r"\s*[\[(](?:seleccionad[oa]|marcad[oa]|elegid[oa])[\])]$")
_VF = {"v": True, "verdadero": True, "true": True, "f": False, "falso": False, "false": False}


def _identifier(value: object) -> str:
    return str(value).strip() if isinstance(value, (str, int)) and not isinstance(value, bool) else ""


def _number(value: object) -> str:
    identifier = _identifier(value)
    return identifier.lstrip("0") or "0" if identifier.isascii() and identifier.isdecimal() else identifier


def _text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    plain = "".join(
        char for char in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(char)
    )
    return " ".join(plain.split())


def _options(question: dict) -> dict[str, str] | None:
    values = question.get("opciones")
    if values in (None, []):
        return {}
    if not isinstance(values, list) or not 2 <= len(values) <= 4:
        return None
    result = {}
    for position, item in enumerate(values):
        expected_letter = "abcd"[position]
        if isinstance(item, dict):
            label = _text(item.get("letra") or item.get("id") or expected_letter)
            value = _text(item.get("texto") or item.get("valor") or item.get("label"))
        else:
            value = _text(item)
            match = _LETTER.fullmatch(value)
            label = match[1] if match and match[2] else expected_letter
            value = match[2] if match and match[2] else value
        if label not in "abcd" or len(label) != 1 or not value or label in result:
            return None
        result[label] = value
    return result


def _choice(value: object, options: dict[str, str], *, allow_mark: bool = False) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    # A tagged transcription may contain the unmarked options too. Only one
    # explicitly marked option is safe; never choose the final mark.
    if allow_mark:
        segments = [part.strip() for part in re.split(r"[,;\n]", value) if part.strip()]
        marked = [part for part in segments if _MARK.search(_text(part))]
        if marked:
            if len(marked) != 1:
                return None
            if len(segments) > 1 and (
                not options or any(_choice(_MARK.sub("", _text(part)), options) is None for part in segments)
            ):
                return None
            value = _MARK.sub("", _text(marked[0]))
    normalized = _text(value)
    exact = [key for key, option in options.items() if option == normalized]
    match = _LETTER.fullmatch(normalized)
    if match:
        letter, label = match.groups()
        if options and (letter not in options or (label and options[letter] != label)):
            return None
        if not options and label and (
            re.search(r"[,;/\n]|\b[a-d]\s*[).:\-]|\b(?:o|y)\s+[a-d]\b", label)
            or re.fullmatch(r"[a-d]", label)
        ):
            return None
        if exact and exact != [letter]:
            return None
        return letter
    return exact[0] if len(exact) == 1 else None


def _truth(value: object) -> bool | None:
    return value if isinstance(value, bool) else _VF.get(_text(value))


def _first(row: dict, fields: tuple[str, ...]) -> object:
    return next((row[field] for field in fields if row.get(field) is not None), None)


def _pages(rows: list[dict]) -> list[int]:
    pages: set[int] = set()
    for row in rows:
        for name in ("pagina", "page", "paginas_origen", "source_pages", "paginas"):
            value = row.get(name)
            for item in value if isinstance(value, list) else [value]:
                if isinstance(item, int) and not isinstance(item, bool) and item > 0:
                    pages.add(item)
    return sorted(pages)


def _clear(row: dict, *, photo: bool) -> bool:
    if any(row.get(name) for name in (
        "respuesta_parcial", "partial", "requiere_revision", "needs_review", "sin_respuesta",
        "blank", "correction_detected", "correccion_detectada", "ambigua", "marca_multiple",
        "marcas_multiples", "lectura_ambigua",
        "multiple_marks", "ambiguous", "uncertain", "alertas", "warnings",
    )) or row.get("legible") is False or row.get("present") is False:
        return False
    if not photo:
        return True
    confidence = _first(row, ("confidence", "confianza"))
    return (
        row.get("legible") is True
        and bool(_pages([row]))
        and isinstance(confidence, (int, float))
        and not isinstance(confidence, bool)
        and isfinite(confidence)
        and _PHOTO_MIN_CONFIDENCE <= confidence <= 1
    )


def build_safe_objective_validation(
    blueprint: dict, detected_answers: list[dict] | None, *, photographic: bool,
) -> list[dict]:
    """Return decisions and explicit abstentions; no incomplete evidence becomes zero."""
    questions = list(blueprint.get("preguntas") or [])
    ids: dict[str, set[int]] = defaultdict(set)
    numbers: dict[str, set[int]] = defaultdict(set)
    keys: dict[str, set[int]] = defaultdict(set)
    for i, question in enumerate(questions):
        if not isinstance(question, dict):
            continue
        key = canonical_key(question, i)
        keys[key].add(i)
        explicit = {_identifier(question.get(field)) for field in _IDS}
        # A canonical key based on the visible number is not a stable ID when
        # that number is reused; indexing it still exposes any collision.
        for identity in (explicit | {key}) - {""}:
            ids[identity].add(i)
            ids[identity.removeprefix("pregunta:")].add(i)
        number = _number(question.get("numero"))
        if number:
            numbers[number].add(i)

    def match(row: dict) -> tuple[int | None, set[int]]:
        number = _number(_first(row, _NUMBERS))
        numbered = numbers.get(number, set())
        explicit = {_identifier(row.get(field)) for field in _IDS} - {""}
        if explicit:
            matches = [ids.get(identity, set()) for identity in explicit]
            known = set().union(*matches)
            if any(len(indices) != 1 for indices in matches) or len(known) != 1:
                return None, known | numbered
            index = next(iter(known))
            if number and index not in numbered:
                return None, known | numbered
            return index, set()
        return (next(iter(numbered)), set()) if len(numbered) == 1 else (None, numbered)

    keyed: dict[int, list[dict]] = defaultdict(list)
    official: dict[int, list[object]] = defaultdict(list)
    ambiguous: dict[int, list[dict]] = defaultdict(list)
    ambiguous_keys: set[int] = set()
    for row in blueprint.get("respuestas_esperadas") or []:
        if not isinstance(row, dict):
            continue  # Positional matching cannot establish question identity.
        index, uncertain = match(row)
        if index is not None:
            official[index].append(_first(row, _KEY_FIELDS))
        ambiguous_keys.update(uncertain)

    def source_matches(index: int, row: dict) -> bool:
        mode = questions[index].get("modalidad_respuesta")
        source = row.get("_objective_source")
        return not (
            (mode == "online" and source == "photo")
            or (mode in {"fisica", "archivo"} and source == "online")
        )

    for row in detected_answers or []:
        if not isinstance(row, dict):
            continue
        index, uncertain = match(row)
        if index is not None and source_matches(index, row):
            keyed[index].append(row)
        for candidate in uncertain:
            if source_matches(candidate, row):
                ambiguous[candidate].append(row)

    decisions = []
    for i, question in enumerate(questions):
        if not isinstance(question, dict) or question.get("tipo") not in _OBJECTIVE:
            continue
        kind = question["tipo"]
        key = canonical_key(question, i)
        rows = keyed[i]
        pages = _pages(rows + ambiguous[i])
        options = _options(question) if kind == "opcion_multiple" else {}
        multiple = any(question.get(field) for field in (
            "seleccion_multiple", "multiple_respuestas", "permite_multiple", "multiple_answers",
            "multiple",
        ))

        def parse(value: object, *, observed: bool = False) -> str | bool | None:
            if kind == "verdadero_falso":
                return _truth(value)
            return _choice(value, options, allow_mark=observed) if options is not None and not multiple else None

        direct = [question[field] for field in _KEY_FIELDS[:2] if question.get(field) is not None]
        references = direct + official[i]
        expected = [parse(value) for value in references]
        resolved_key = (
            expected[0] if expected and all(value is not None and value == expected[0] for value in expected)
            and not (i in ambiguous_keys and not direct) else None
        )
        observed = []
        result = None
        if len(keys[key]) != 1 or ambiguous[i]:
            reason = "identidad_ambigua"
        elif resolved_key is None:
            reason = "clave_no_verificable"
        elif not rows:
            reason = "sin_lectura"
        elif not all(
            _clear(row, photo=(row.get("_objective_source") == "photo" if row.get("_objective_source") in {"photo", "online"} else photographic))
            for row in rows
        ):
            reason = "lectura_no_verificable"
        else:
            observed = [parse(_first(row, ("answer", "respuesta")), observed=True) for row in rows]
            if any(value is None for value in observed) or len(set(observed)) != 1:
                reason = "lectura_ambigua"
            else:
                result = observed[0] == resolved_key
                reason = "coincide_clave" if result else "no_coincide_clave"

        def display(value: object) -> str | None:
            if isinstance(value, bool):
                return "Verdadero" if value else "Falso"
            return value.upper() if isinstance(value, str) else None

        reading = display(observed[0]) if result is not None else None
        if result is None and reason != "identidad_ambigua" and rows:
            fragments = []
            for row in rows:
                raw = _first(row, ("answer", "respuesta"))
                value = ("Verdadero" if raw else "Falso") if isinstance(raw, bool) else (
                    " ".join(raw.split())[:300] if isinstance(raw, str) else ""
                )
                if value:
                    page_label = ", ".join(map(str, _pages([row])))
                    fragment = f"Hoja {page_label}: {value}" if page_label else value
                    if fragment not in fragments:
                        fragments.append(fragment)
            reading = ("Lectura por comprobar: " + " · ".join(sorted(fragments)))[:2000] if fragments else None

        decisions.append({
            "clave": key,
            "numero": question.get("numero", i + 1),
            "tipo": kind,
            "correcta": result,
            "motivo": reason,
            "paginas": pages,
            "respuesta_detectada": reading,
            "respuesta_esperada": display(resolved_key),
            "fuente": "clave_oficial",
        })
    return decisions
