"""Spec 160, PR 3: las instrucciones piden primero la acción y un lenguaje para el estudiante."""
import asyncio

from app.modules.calificaciones import agents
from app.modules.calificaciones.feedback_refinement import refine_feedback_if_needed


def formative_rules(rules: dict | None = None) -> str:
    blueprint = {"preguntas": [], "criterios": [], **({"reglas_feedback": rules} if rules else {})}
    prompt = agents.render_grader_prompt(agents.AgentContext(
        evaluacion_nombre="Lectura", nota_maxima=5, blueprint=blueprint, student_response_text="Nico"))
    return prompt.split("## Retroalimentación formativa", 1)[1].split("Preferencias de redacción", 1)[0]


def rewrite_prompt() -> str:
    class Client:
        prompt = ""

        async def chat(self, **kwargs):
            Client.prompt = kwargs["messages"][0]["content"]
            return {"choices": [{"message": {"content": {"retroalimentacion": "x", "preguntas_usadas": ["pregunta:2"]}}}]}

    components = [{"clave": "pregunta:2", "numero": "2", "estado": "incorrecta", "puntaje": 0,
                   "respuesta_estudiante": "Las nubes parecían algodones de azúcar",
                   "explicacion": "Se preguntó por la emoción y se respondió una comparación de las nubes.",
                   "orientacion_mejora": "Relee la primera frase y busca una palabra que exprese una emoción."}]
    asyncio.run(refine_feedback_if_needed("Buen trabajo. Sigue practicando.", components,
                                          client=Client(), model="qwen3.8-flash", enabled=True))
    return Client.prompt.split('{"componentes_revisados"', 1)[0]


def test_fr005_el_calificador_pide_primero_la_accion_y_el_error_breve():
    rules = formative_rules()
    assert "Empieza por un acierto realmente observado." in rules
    assert "di primero qué hacer con una acción breve y verificable, y luego, en una frase, por qué" in rules
    assert "Menciona el error solo para explicar esa acción" in rules
    assert "orientacion_mejora dice qué hacer y empieza por un verbo" in rules
    # El orden anterior terminaba con la acción.
    assert "termina con una acción breve y verificable" not in rules


def test_fr005_la_meta_se_dice_en_palabras_sencillas_y_no_se_inventa():
    rules = formative_rules()
    assert "di en palabras sencillas qué se buscaba" in rules
    assert "Si no existe, no lo inventes" in rules


def test_fr006_los_textos_del_estudiante_no_nombran_el_funcionamiento_interno():
    rules = formative_rules()
    rule = next(line for line in rules.splitlines() if "funcionamiento interno" in line)
    for field in ("feedback_estudiante", "explicacion", "orientacion_mejora"):
        assert field in rule
    for term in ("validación objetiva", "clave oficial", "verificador", "transcripción", "reparto"):
        assert term in rule
    assert "«tu respuesta»" in rule and "«la respuesta esperada»" in rule
    # Lo que es para el docente tiene dónde ir, y la interfaz lo muestra en la pregunta (Spec 213).
    assert "va en alertas" in rule and "«P3: …»" in rule


def test_fr006_orientar_sin_dar_respuesta_cubre_los_tres_textos():
    rule = next(line for line in formative_rules({"orientar_sin_dar_respuesta": True}).splitlines()
                if "orientar_sin_dar_respuesta" in line)
    for field in ("feedback_estudiante", "explicacion", "orientacion_mejora"):
        assert field in rule
    assert "no escribas la letra, el valor ni el texto esperados" in rule
    assert "da una pista o un paso" in rule
    # La regla anterior solo protegía la orientación.
    assert "sin revelar la solución en la orientación" not in rule


def test_fr005_fr006_la_reescritura_sigue_el_mismo_orden_y_lenguaje():
    prompt = rewrite_prompt()
    assert "di primero qué hacer con una acción breve y verificable" in prompt
    assert "y luego, en una frase, por qué" in prompt
    assert "No nombres el funcionamiento interno" in prompt
    for term in ("validación", "clave oficial", "verificador", "transcripción", "reparto"):
        assert term in prompt
    # Se conservan las protecciones anteriores.
    assert "no inventes un acierto" in prompt and "No des soluciones para copiar" in prompt
    assert "explica la dificultad registrada y propone" not in prompt
