import asyncio
from uuid import uuid4

from app.modules.presentaciones import service
from app.modules.presentaciones.schemas import PresentacionCreate


def _payload() -> PresentacionCreate:
    return PresentacionCreate(
        titulo="El ciclo del agua",
        tema="El ciclo del agua",
        area="Ciencias naturales",
        grado="4",
        cantidad_slides=5,
    )


def test_targeted_repair_sends_only_the_defective_slide() -> None:
    payload = _payload()
    slides = [
        {
            "role": "concept",
            "title": f"Etapa {index + 1}",
            "key_message": f"Mensaje diferente {index + 1}",
            "bullets": [
                f"Contenido verificable de la etapa numero {index + 1}.",
                "Esta idea aporta informacion diferente al proceso completo.",
            ],
        }
        for index in range(5)
    ]
    prompts: list[str] = []

    class Editor:
        async def generate_json(self, feature: str, prompt: str):
            prompts.append(prompt)
            return {
                "repairs": [
                    {
                        "index": 3,
                        "slide": {
                            **slides[2],
                            "title": "Condensacion en las nubes",
                        },
                    }
                ]
            }

    repaired = asyncio.run(
        service._repair_targeted_slides(
            Editor(),
            slides,
            payload,
            ["La diapositiva 3 no desarrolla contenido suficiente."],
        )
    )

    assert len(prompts) == 1
    assert '"index": 3' in prompts[0]
    assert '"title": "Etapa 1"' not in prompts[0]
    assert '"title": "Etapa 5"' not in prompts[0]
    assert repaired[2]["title"] == "Condensacion en las nubes"


def test_standard_valid_deck_uses_one_content_request(monkeypatch) -> None:
    payload = _payload()
    calls: list[str] = []

    class Router:
        def __init__(self, *args, **kwargs):
            pass

        async def generate_json(self, feature: str, prompt: str):
            calls.append(prompt)
            return {
                "slides": [
                    {
                        "role": "concept",
                        "title": f"Etapa {index + 1}",
                        "key_message": f"Mensaje {index + 1}",
                        "bullets": [
                            "El agua cambia de estado durante el ciclo natural.",
                            "La energia solar impulsa varios cambios observables.",
                        ],
                    }
                    for index in range(5)
                ]
            }

    monkeypatch.setattr(service, "LLMRouter", Router)
    monkeypatch.setattr(service, "_presentation_quality_issues", lambda *_args: [])
    monkeypatch.setattr(service, "_needs_accuracy_review", lambda *_args: False)

    slides = asyncio.run(service._generate_slides(payload, uuid4()))

    assert len(slides) == 5
    assert len(calls) == 1
