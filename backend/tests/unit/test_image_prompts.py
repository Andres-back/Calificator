"""Tests del constructor central de prompts de imagen y del hash de dedupe."""
from app.modules.imagenes.service import compute_prompt_hash
from app.modules.presentaciones.image_prompts import build_presentation_image_prompt
from app.shared.enums import ImageProvider


def test_support_prompt_no_permite_texto():
    bundle = build_presentation_image_prompt(
        "support",
        raw_prompt="carro frenando y objetos siguiendo hacia adelante",
        title="La inercia",
        bullets=["Un objeto permanece en reposo si nada lo empuja."],
        topic="Primera Ley de Newton",
        area="Fisica",
        grade="6",
        provider=ImageProvider.OPENAI,
    )
    assert "sin texto" in bundle.prompt_usado
    assert bundle.tipo_uso == "apoyo_visual"
    assert bundle.image_text_expected == []
    assert bundle.prompt_original == "carro frenando y objetos siguiendo hacia adelante"
    assert bundle.prompt_normalizado


def test_full_image_prompt_incluye_texto_grande():
    bundle = build_presentation_image_prompt(
        "full_image",
        raw_prompt="carro frenando, objetos hacia adelante y libro en reposo con flechas de fuerza",
        title="Primera Ley de Newton",
        bullets=["Un objeto permanece en reposo o movimiento rectilineo uniforme."],
        topic="Primera Ley de Newton",
        grade="6",
        provider=ImageProvider.OPENAI,
    )
    assert "Infografia educativa horizontal 16:9" in bundle.prompt_usado
    assert "Texto visible exacto" in bundle.prompt_usado
    assert bundle.tipo_uso == "infografia_completa"
    assert bundle.image_text_expected
    assert bundle.image_text_expected[0].startswith("PRIMERA LEY")
    assert "sin texto pequeño" in bundle.restricciones
    # Prompt corto y concreto para gpt-image-2 low (no gigante).
    assert len(bundle.prompt_usado.split()) <= 120


def test_cover_prompt_es_portada():
    bundle = build_presentation_image_prompt(
        "cover",
        raw_prompt="aula alegre con estudiantes",
        title="La lectura",
        bullets=[],
        topic="Comprension lectora",
        nivel="primaria",
        provider=ImageProvider.OPENAI,
    )
    assert "Portada educativa" in bundle.prompt_usado
    assert bundle.tipo_uso == "portada"
    assert bundle.image_text_expected


def test_prompt_hash_es_determinista_y_sensible_a_calidad():
    h1 = compute_prompt_hash("abc", modelo="gpt-image-2", calidad="low", size="1536x1024")
    h2 = compute_prompt_hash("abc", modelo="gpt-image-2", calidad="low", size="1536x1024")
    h3 = compute_prompt_hash("abc", modelo="gpt-image-2", calidad="high", size="1536x1024")
    h4 = compute_prompt_hash("abc", modelo="gpt-image-2", calidad="low", size="1024x1024")
    assert h1 == h2
    assert h1 != h3
    assert h1 != h4
