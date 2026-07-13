from app.modules.materias.code_generator import ALPHABET, generate_matricula_code


def test_generate_matricula_code_has_expected_format() -> None:
    code = generate_matricula_code(prefix="XCA", length=8)

    assert code.startswith("XCA-")
    assert len(code) == 12
    assert all(character in ALPHABET for character in code.split("-", 1)[1])


def test_generate_matricula_code_is_not_constant() -> None:
    codes = {generate_matricula_code() for _ in range(10)}

    assert len(codes) > 1
