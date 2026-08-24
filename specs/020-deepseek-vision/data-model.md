# Modelo de datos lógico

## VisionExtraction

- `student_detected: bool`
- `document_quality: float [0,1]`
- `pages_processed: int`
- `answers: list[ExtractedAnswer]`
- `pages: list[VisionPageResult]`
- `warnings: list[str]`
- `requires_review: bool`
- `provider/model/fallback metadata`

## ExtractedAnswer

- `question_id: str | null`
- `question_number: int | str`
- `answer: str | null`
- `confidence: float [0,1]`
- `page: int >= 1`
- `legible: bool`
- `blank: bool`
- `needs_review: bool`
- `correction_detected: bool`
- `warning: str | null`

Reglas: `legible=false` obliga `answer=null` y `needs_review=true`; una respuesta vacía se distingue de ilegible.

## VisionPageResult

- `page: int`
- `status: extracted|requires_review|failed_temporary|failed_permanent`
- `duration_ms: int`
- `size_bytes: int`
- `answers: list[ExtractedAnswer]`
- `warnings: list[str]`
- `error_code: str | null`

## Transiciones

`PROCESSING → EXTRACTED → GRADED`; cualquier incertidumbre relevante produce `REQUIRES_REVIEW`; transporte agotado produce `FAILED_TEMPORARY`; archivo/schema definitivo produce `FAILED_PERMANENT`.
