from app.modules.imagenes import service as imagenes_service
from app.modules.presentaciones import service
from app.modules.presentaciones.image_prompts import build_presentation_image_prompt
from app.modules.presentaciones.presentation_schema import normalize_to_canonical
from app.modules.presentaciones.schemas import PresentacionCreate
from app.shared.enums import ImageProvider


def _payload(cantidad_slides: int = 8) -> PresentacionCreate:
    return PresentacionCreate(
        titulo="Primera Ley de Newton",
        tema="Primera Ley de Newton",
        area="Fisica",
        grado="6",
        cantidad_slides=cantidad_slides,
        incluir_imagenes=True,
        densidad_imagenes="alta",
        proveedor_imagenes="premium",
    )


def test_slides_prompt_solicita_esquema_pedagogico_enriquecido() -> None:
    prompt = service.SLIDES_PROMPT

    for field in [
        "role",
        "key_message",
        "example",
        "activity",
        "question",
        "visual_concept",
        "layout_hint",
        "image_text_expected",
        "tags",
    ]:
        assert field in prompt
    for role in ["cover", "objective", "prior_knowledge", "concept", "activity", "assessment", "closing"]:
        assert role in prompt


def test_roles_validos_se_conservan_y_roles_invalidos_tienen_fallback() -> None:
    slides = service._apply_pedagogical_slide_defaults(
        [
            {"role": "cover", "title": "Inicio", "bullets": ["Idea inicial"], "visual_concept": "Aula"},
            {"role": "rol_raro", "title": "Ejemplo guiado", "bullets": ["Idea clara"]},
        ],
        _payload(3),
    )

    assert slides[0]["role"] == "cover"
    assert slides[1]["role"] == "example"


def test_slide_intermedia_puede_ser_full_image_y_ultima_editable() -> None:
    slides = service._apply_pedagogical_slide_defaults(
        [
            {"role": "cover", "title": "Newton", "bullets": ["Inicio"], "visual_concept": "Portada"},
            {"role": "objective", "title": "Objetivo", "bullets": ["Comprender la inercia"]},
            {
                "role": "concept",
                "title": "Ley de la inercia",
                "key_message": "Los cuerpos mantienen su estado.",
                "bullets": ["Un objeto quieto permanece quieto."],
                "visual_concept": "Autobus frenando con flechas simples",
                "layout_hint": "full_image",
                "image_text_expected": ["LEY DE LA INERCIA", "Un objeto quieto permanece quieto"],
            },
            {
                "role": "activity",
                "title": "Observemos la inercia",
                "bullets": ["Retira una tarjeta rapidamente."],
                "layout_hint": "editable",
            },
        ],
        _payload(4),
    )
    legacy_full_idx = service._full_image_index(slides)

    assert service._image_kind_for_slide(slides[2], index=2, legacy_full_idx=legacy_full_idx) == "full_image"
    assert service._should_be_full_image(slides[3], index=3, legacy_full_idx=legacy_full_idx) is False
    assert slides[3]["layout_hint"] == "editable"


def test_activity_y_assessment_son_editables_por_defecto() -> None:
    slides = service._apply_pedagogical_slide_defaults(
        [
            {"role": "activity", "title": "Actividad", "bullets": ["Resuelve en equipo."]},
            {"role": "assessment", "title": "Evaluacion", "bullets": ["Responde la pregunta."]},
        ],
        _payload(3),
    )

    assert slides[0]["layout_hint"] == "editable"
    assert slides[1]["layout_hint"] == "editable"
    assert slides[0]["image_text_expected"] == []
    assert slides[1]["image_text_expected"] == []


def test_ocho_slides_refuerza_hitos_pedagogicos_minimos() -> None:
    slides = service._apply_pedagogical_slide_defaults(
        [
            {"role": "cover", "title": "Newton", "bullets": ["Inicio"], "visual_concept": "Portada"},
            {"role": "objective", "title": "Objetivo", "bullets": ["Comprender la inercia"]},
            {"role": "prior_knowledge", "title": "Previos", "bullets": ["Recordar movimiento"]},
            {
                "role": "concept",
                "title": "Inercia",
                "bullets": ["Los cuerpos mantienen su estado."],
                "visual_concept": "Bus frenando",
                "image_text_expected": ["INERCIA", "Los cuerpos mantienen su estado"],
            },
            {"role": "explanation", "title": "Explicacion", "bullets": ["Una fuerza cambia el estado."]},
            {"role": "example", "title": "Ejemplo", "bullets": ["Un pasajero se inclina al frenar."]},
            {"role": "activity", "title": "Actividad", "bullets": ["Observa un experimento simple."]},
            {"role": "summary", "title": "Resumen", "bullets": ["La inercia explica el movimiento."]},
        ],
        _payload(8),
    )

    assert [slide["role"] for slide in slides] == [
        "cover",
        "objective",
        "prior_knowledge",
        "concept",
        "explanation",
        "activity",
        "comprehension_check",
        "summary",
    ]
    assert slides[5]["layout_hint"] == "editable"
    assert slides[6]["layout_hint"] == "editable"
    assert slides[6]["question"]


def test_full_image_requiere_concepto_visual_y_texto_esperado() -> None:
    slide = {
        "role": "concept",
        "title": "Inercia",
        "layout_hint": "full_image",
        "visual_concept": "",
        "image_text_expected": [],
    }

    assert service._should_be_full_image(slide, index=1, legacy_full_idx=2) is False


def test_canonical_preserva_campos_pedagogicos_y_legacy_sigue_normalizando() -> None:
    canonical = normalize_to_canonical(
        {
            "title": "Newton",
            "slides": [
                {
                    "role": "concept",
                    "title": "Ley de la inercia",
                    "key_message": "Los cuerpos mantienen su estado.",
                    "bullets": ["Un objeto quieto permanece quieto."],
                    "visual_concept": "Autobus frenando",
                    "layout_hint": "full_image",
                    "image_text_expected": ["LEY DE LA INERCIA"],
                    "tags": ["fisica", "newton"],
                    "notes": "Relaciona con transporte.",
                },
                {"title": "Legacy", "bullets": ["Idea clave"], "image": "Ilustracion legacy"},
            ],
        },
        {"titulo": "Newton", "tema": "Primera Ley de Newton"},
    )

    first = canonical["slides"][0]
    second = canonical["slides"][1]
    assert first["role"] == "concept"
    assert first["key_message"] == "Los cuerpos mantienen su estado."
    assert first["visual_concept"] == "Autobus frenando"
    assert first["layout_hint"] == "full_image"
    assert first["image_text_expected"] == ["LEY DE LA INERCIA"]
    assert first["tags"] == ["fisica", "newton"]
    assert first["texto_principal"]
    assert second["title"] if "title" in second else second["titulo"]


def test_builder_full_image_usa_texto_esperado_sin_inventar_texto_visible() -> None:
    bundle = build_presentation_image_prompt(
        "full_image",
        raw_prompt="Autobus frenando con pasajeros inclinados",
        title="Ley de la inercia",
        bullets=["Este bullet no debe aparecer como texto visible."],
        topic="Primera Ley de Newton",
        area="Fisica",
        grade="6",
        provider=ImageProvider.OPENAI,
        role="concept",
        key_message="Los cuerpos mantienen su estado.",
        visual_concept="Autobus frenando con flechas de movimiento",
        image_text_expected=["LEY DE LA INERCIA", "Un objeto quieto permanece quieto"],
        tags=["fisica", "newton"],
    )

    assert bundle.prompt_original == "Autobus frenando con flechas de movimiento"
    assert '"LEY DE LA INERCIA"' in bundle.prompt_usado
    assert '"Un objeto quieto permanece quieto"' in bundle.prompt_usado
    assert "Este bullet no debe aparecer" not in bundle.prompt_usado
    assert "horizontal 16:9" in bundle.prompt_usado
    assert "sin texto pequeño" in bundle.prompt_usado
    assert bundle.image_text_expected == ["LEY DE LA INERCIA", "Un objeto quieto permanece quieto"]
    assert len(bundle.prompt_usado.split()) <= 110


def test_openai_modelo_calidad_y_hash_no_cambian() -> None:
    modelo, calidad = imagenes_service.provider_model_quality("openai")
    h1 = imagenes_service.compute_prompt_hash("abc", modelo=modelo, calidad=calidad, size=service.SLIDE_IMAGE_SIZE)
    h2 = imagenes_service.compute_prompt_hash("abc", modelo=modelo, calidad=calidad, size=service.SLIDE_IMAGE_SIZE)

    assert modelo == "gpt-image-2"
    assert calidad == "low"
    assert h1 == h2
