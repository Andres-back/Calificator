"""Bounded declarative data only: never executable model-generated graphics."""
from __future__ import annotations

import json
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError, model_validator

MAX_BYTES = 48 * 1024
NOTICE = 'No pudimos mostrar uno de los apoyos visuales. Conservamos la explicación para que puedas revisarla.'
BLOCK = re.compile(r'```xcalificator-visual[^\n]*\n[\s\S]*?(?:```|$)')
Number = Annotated[float, Field(ge=-1_000_000, le=1_000_000, allow_inf_nan=False)]
Domain = Annotated[list[Number], Field(min_length=2, max_length=2)]
Label = Annotated[str, Field(max_length=80)]


def safe_text(value: object) -> None:
    if isinstance(value, str):
        if re.search(r'```|[\x00-\x1f\x7f]|https?://|<\s*[/!a-zA-Z]', value, re.IGNORECASE):
            raise ValueError('Unsafe visual label')
    elif isinstance(value, list):
        for item in value:
            safe_text(item)
    elif isinstance(value, dict):
        for item in value.values():
            safe_text(item)


class StrictData(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    @model_validator(mode='before')
    @classmethod
    def labels_are_data(cls, value):
        safe_text(value)
        return value


class Visual(StrictData):
    id: Annotated[str, Field(min_length=1, max_length=40, pattern=r'^[a-zA-Z0-9_-]+$')]
    titulo: Annotated[str, Field(min_length=1, max_length=100)]
    descripcion: Annotated[str, Field(min_length=1, max_length=500)]


Cell = Annotated[str, Field(max_length=200)] | Number


class Table(Visual):
    tipo: Literal['tabla']
    columnas: Annotated[list[Label], Field(min_length=1, max_length=8)]
    filas: Annotated[list[Annotated[list[Cell], Field(max_length=8)]], Field(max_length=30)]

    @model_validator(mode='after')
    def rectangular(self):
        if any(len(row) != len(self.columnas) for row in self.filas):
            raise ValueError('Irregular table')
        return self


class Series(StrictData):
    nombre: Label
    valores: Annotated[list[Number], Field(min_length=1, max_length=60)]


class Chart(Visual):
    tipo: Literal['grafico']
    subtipo: Literal['barras', 'linea']
    etiquetas: Annotated[list[Label], Field(min_length=1, max_length=60)]
    series: Annotated[list[Series], Field(min_length=1, max_length=4)]
    unidad: Label = ''

    @model_validator(mode='after')
    def aligned(self):
        if any(len(series.valores) != len(self.etiquetas) for series in self.series):
            raise ValueError('Unequal series lengths')
        return self


class Point(StrictData):
    x: Number
    y: Number
    etiqueta: Label = ''


class Line(StrictData):
    pendiente: Number
    intercepto: Number


class Bounds(Visual):
    x: Domain
    y: Domain

    @model_validator(mode='after')
    def increasing(self):
        if self.x[1] - self.x[0] < 1e-6 or self.y[1] - self.y[0] < 1e-6:
            raise ValueError('Invalid domain')
        return self

    def contains(self, x: float, y: float) -> bool:
        return self.x[0] <= x <= self.x[1] and self.y[0] <= y <= self.y[1]


class Plane(Bounds):
    tipo: Literal['plano']
    puntos: Annotated[list[Point], Field(max_length=60)] = []
    lineas: Annotated[list[Annotated[list[Point], Field(min_length=2, max_length=60)]], Field(max_length=4)] = []
    rectas: Annotated[list[Line], Field(max_length=4)] = []

    @model_validator(mode='after')
    def within_bounds(self):
        if any(not self.contains(p.x, p.y) for p in [*self.puntos, *(p for line in self.lineas for p in line)]):
            raise ValueError('Point outside domain')
        if not (self.puntos or self.lineas or self.rectas):
            raise ValueError('Empty plane')
        for line in self.rectas:
            ends = [line.pendiente * x + line.intercepto for x in self.x]
            if min(ends) > self.y[1] or max(ends) < self.y[0]:
                raise ValueError('Line outside domain')
        return self


class Segment(StrictData):
    tipo: Literal['segmento']
    x1: Number
    y1: Number
    x2: Number
    y2: Number


class Circle(StrictData):
    tipo: Literal['circulo']
    x: Number
    y: Number
    radio: Annotated[Number, Field(gt=0)]


class Rectangle(StrictData):
    tipo: Literal['rectangulo']
    x: Number
    y: Number
    ancho: Annotated[Number, Field(gt=0)]
    alto: Annotated[Number, Field(gt=0)]


class Polygon(StrictData):
    tipo: Literal['poligono']
    puntos: Annotated[list[Point], Field(min_length=3, max_length=60)]


class Text(StrictData):
    tipo: Literal['etiqueta']
    x: Number
    y: Number
    texto: Label


Primitive = Annotated[Segment | Circle | Rectangle | Polygon | Text, Field(discriminator='tipo')]


class Figure(Bounds):
    tipo: Literal['figura']
    primitivas: Annotated[list[Primitive], Field(min_length=1, max_length=40)]

    @model_validator(mode='after')
    def within_bounds(self):
        for p in self.primitivas:
            if isinstance(p, Segment):
                points = [(p.x1, p.y1), (p.x2, p.y2)]
            elif isinstance(p, Circle):
                points = [(p.x - p.radio, p.y - p.radio), (p.x + p.radio, p.y + p.radio)]
            elif isinstance(p, Rectangle):
                points = [(p.x, p.y), (p.x + p.ancho, p.y + p.alto)]
            elif isinstance(p, Polygon):
                points = [(point.x, point.y) for point in p.puntos]
            else:
                points = [(p.x, p.y)]
            if any(not self.contains(x, y) for x, y in points):
                raise ValueError('Figure outside domain')
        return self


VISUAL = TypeAdapter(Annotated[Table | Chart | Plane | Figure, Field(discriminator='tipo')])


def clean_envelope(value: object) -> dict:
    result: dict = {'version': 1, 'visuales': [], 'avisos': []}
    try:
        if len(json.dumps(value, allow_nan=False).encode('utf-8')) > MAX_BYTES:
            raise ValueError('Oversized visual data')
        if not isinstance(value, dict) or set(value) - {'version', 'visuales'}:
            raise ValueError('Unknown fields')
        if type(value.get('version')) is not int or value['version'] != 1:
            raise ValueError('Unknown version')
        values = value.get('visuales')
        if not isinstance(values, list) or len(values) > 4:
            raise ValueError('Visual limit')
        ids: set[str] = set()
        for item in values:
            try:
                visual = VISUAL.validate_python(item)
                if visual.id in ids:
                    raise ValueError('Duplicate visual id')
                ids.add(visual.id)
                result['visuales'].append(visual.model_dump())
            except (ValueError, ValidationError):
                result['avisos'] = [NOTICE]
    except (ValueError, TypeError, RecursionError):
        result['avisos'] = [NOTICE]
    return result


def split_response(response: str) -> tuple[str, dict]:
    blocks = list(BLOCK.finditer(response))
    plain = BLOCK.sub('', response).strip()
    empty = {'version': 1, 'visuales': [], 'avisos': []}
    if not blocks:
        return plain, empty
    if len(blocks) != 1 or not blocks[0].group().startswith('```xcalificator-visual-v1\n'):
        return plain, {**empty, 'avisos': [NOTICE]}
    body = blocks[0].group().split('\n', 1)[1]
    if not body.endswith('```') or len(body.encode('utf-8')) > MAX_BYTES:
        return plain, {**empty, 'avisos': [NOTICE]}
    try:
        envelope = clean_envelope(json.loads(body[:-3]))
    except (ValueError, RecursionError):
        envelope = {**empty, 'avisos': [NOTICE]}
    return plain, envelope


def wire_response(plain: str, envelope: dict) -> str:
    safe = clean_envelope({'version': envelope.get('version'), 'visuales': envelope.get('visuales', [])})
    response = plain.strip()
    if envelope.get('avisos') or safe['avisos']:
        response = f'{response}\n\n{NOTICE}'.strip()
    if safe['visuales']:
        payload = json.dumps({'version': 1, 'visuales': safe['visuales']}, ensure_ascii=False, allow_nan=False)
        response += f'\n\n```xcalificator-visual-v1\n{payload}\n```'
    return response


VISUAL_INSTRUCTIONS = '''Cuando el docente solicite tablas, gráficas, figuras o planos, incluye explicación y un solo bloque:
```xcalificator-visual-v1
{"version":1,"visuales":[...]}
```
Cada visual: id corto alfanumérico, tipo, titulo, descripcion. Máximo 4 visuales, sin campos extra.
Tipos:
tabla: columnas (hasta 8), filas rectangulares de texto/números (hasta 30).
grafico: subtipo barras o linea, etiquetas (hasta 60), series [{nombre,valores}] (hasta 4), unidad opcional.
plano: x:[min,max], y:[min,max], puntos:[{x,y,etiqueta?}], lineas:[[puntos]], rectas:[{pendiente,intercepto}].
figura: x/y dominios y primitivas: {tipo:segmento,x1,y1,x2,y2}, {tipo:circulo,x,y,radio},
{tipo:rectangulo,x,y,ancho,alto}, {tipo:poligono,puntos:[{x,y}]}, {tipo:etiqueta,x,y,texto}.
Dominios crecientes y todos los objetos dentro; coordenadas finitas entre -1000000 y 1000000.
No código, funciones, URLs, HTML/SVG, CSS ni instrucciones ejecutables en los datos. Conserva signos/unidades/valores.
Declara datos de ejemplo; si faltan datos pregunta, no inventes precisión. Si no puedes representar un pedido, explica el límite.
No afirmes mostrar un visual si no incluyes datos válidos. El docente puede pedir soluciones razonadas.'''
