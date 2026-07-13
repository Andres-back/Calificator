from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.modules.dba.models import DBACatalog

AREA = "Ciencias Naturales y Educacion Ambiental"
FUENTE = (
    "MEN / Colombia Aprende - Derechos Basicos de Aprendizaje DBA Ciencias Naturales "
    "https://www.colombiaaprende.edu.co/sites/default/files/files_public/2026-05/dba_c.naturales-min.pdf"
)

DBA_ITEMS = [
    {
        "grado": "1",
        "codigo": "DBA-CN-1-01",
        "descripcion": "Comprende que los sentidos le permiten percibir algunas caracteristicas de los objetos que nos rodean (temperatura, sabor, sonidos, olor, color, texturas y formas).",
    },
    {
        "grado": "1",
        "codigo": "DBA-CN-1-02",
        "descripcion": "Comprende que existe una gran variedad de materiales y que estos se utilizan para distintos fines, segun sus caracteristicas (longitud, dureza, flexibilidad, permeabilidad al agua, solubilidad, ductilidad, maleabilidad, color, sabor, textura).",
    },
    {
        "grado": "1",
        "codigo": "DBA-CN-1-03",
        "descripcion": "Comprende que los seres vivos (plantas y animales) tienen caracteristicas comunes (se alimentan, respiran, tienen un ciclo de vida, responden al entorno) y los diferencia de los objetos inertes.",
    },
    {
        "grado": "1",
        "codigo": "DBA-CN-1-04",
        "descripcion": "Comprende que su cuerpo experimenta constantes cambios a lo largo del tiempo y reconoce a partir de su comparacion que tiene caracteristicas similares y diferentes a las de sus padres y companeros.",
    },
    {
        "grado": "2",
        "codigo": "DBA-CN-2-01",
        "descripcion": "Comprende que una accion mecanica (fuerza) puede producir distintas deformaciones en un objeto, y que este resiste a las fuerzas de diferente modo, de acuerdo con el material del que esta hecho.",
    },
    {
        "grado": "2",
        "codigo": "DBA-CN-2-02",
        "descripcion": "Comprende que las sustancias pueden encontrarse en distintos estados (solido, liquido y gaseoso).",
    },
    {
        "grado": "2",
        "codigo": "DBA-CN-2-03",
        "descripcion": "Comprende la relacion entre las caracteristicas fisicas de plantas y animales con los ambientes en donde viven, teniendo en cuenta sus necesidades basicas (luz, agua, aire, suelo, nutrientes, desplazamiento y proteccion).",
    },
    {
        "grado": "2",
        "codigo": "DBA-CN-2-04",
        "descripcion": "Explica los procesos de cambios fisicos que ocurren en el ciclo de vida de plantas y animales de su entorno, en un periodo de tiempo determinado.",
    },
    {
        "grado": "3",
        "codigo": "DBA-CN-3-01",
        "descripcion": "Comprende la forma en que se propaga la luz a traves de diferentes materiales (opacos, transparentes como el aire, translucidos como el papel y reflectivos como el espejo).",
    },
    {
        "grado": "3",
        "codigo": "DBA-CN-3-02",
        "descripcion": "Comprende la forma en que se produce la sombra y la relacion de su tamano con las distancias entre la fuente de luz, el objeto interpuesto y el lugar donde se produce la sombra.",
    },
    {
        "grado": "3",
        "codigo": "DBA-CN-3-03",
        "descripcion": "Comprende la naturaleza (fenomeno de la vibracion) y las caracteristicas del sonido (altura, timbre, intensidad) y que este se propaga en distintos medios (solidos, liquidos, gaseosos).",
    },
    {
        "grado": "3",
        "codigo": "DBA-CN-3-04",
        "descripcion": "Comprende la influencia de la variacion de la temperatura en los cambios de estado de la materia, considerando como ejemplo el caso del agua.",
    },
    {
        "grado": "3",
        "codigo": "DBA-CN-3-05",
        "descripcion": "Explica la influencia de los factores abioticos (luz, temperatura, suelo y aire) en el desarrollo de los factores bioticos (fauna y flora) de un ecosistema.",
    },
    {
        "grado": "3",
        "codigo": "DBA-CN-3-06",
        "descripcion": "Comprende las relaciones de los seres vivos con otros organismos de su entorno (intra e interespecificas) y las explica como esenciales para su supervivencia en un ambiente determinado.",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-01",
        "descripcion": "Comprende que la magnitud y la direccion en que se aplica una fuerza puede producir cambios en la forma como se mueve un objeto (direccion y rapidez).",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-02",
        "descripcion": "Comprende los efectos y las ventajas de utilizar maquinas simples en diferentes tareas que requieren la aplicacion de una fuerza.",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-03",
        "descripcion": "Comprende que el fenomeno del dia y la noche se debe a que la Tierra rota sobre su eje y en consecuencia el sol solo ilumina la mitad de su superficie.",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-04",
        "descripcion": "Comprende que las fases de la Luna se deben a la posicion relativa del Sol, la Luna y la Tierra a lo largo del mes.",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-05",
        "descripcion": "Comprende que existen distintos tipos de mezclas (homogeneas y heterogeneas) que de acuerdo con los materiales que las componen pueden separarse mediante diferentes tecnicas (filtracion, tamizado, decantacion, evaporacion).",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-06",
        "descripcion": "Comprende que los organismos cumplen distintas funciones en cada uno de los niveles troficos y que las relaciones entre ellos pueden representarse en cadenas y redes alimenticias.",
    },
    {
        "grado": "4",
        "codigo": "DBA-CN-4-07",
        "descripcion": "Comprende que existen distintos tipos de ecosistemas (terrestres y acuaticos) y que sus caracteristicas fisicas (temperatura, humedad, tipos de suelo, altitud) permiten que habiten en ellos diferentes seres vivos.",
    },
    {
        "grado": "5",
        "codigo": "DBA-CN-5-01",
        "descripcion": "Comprende que un circuito electrico basico esta formado por un generador o fuente (pila), conductores (cables) y uno o mas dispositivos (bombillos, motores, timbres), que deben estar conectados apropiadamente (por sus dos polos) para que funcionen y produzcan diferentes efectos.",
    },
    {
        "grado": "5",
        "codigo": "DBA-CN-5-02",
        "descripcion": "Comprende que algunos materiales son buenos conductores de la corriente electrica y otros no (denominados aislantes) y que el paso de la corriente siempre genera calor.",
    },
    {
        "grado": "5",
        "codigo": "DBA-CN-5-03",
        "descripcion": "Comprende que los sistemas del cuerpo humano estan formados por organos, tejidos y celulas y que la estructura de cada tipo de celula esta relacionada con la funcion del tejido que forman.",
    },
    {
        "grado": "5",
        "codigo": "DBA-CN-5-04",
        "descripcion": "Comprende que en los seres humanos (y en muchos otros animales) la nutricion involucra el funcionamiento integrado de un conjunto de sistemas de organos: digestivo, respiratorio y circulatorio.",
    },
]


async def seed() -> tuple[int, int]:
    created = 0
    updated = 0
    async with AsyncSessionLocal() as db:
        for item in DBA_ITEMS:
            existing = await db.scalar(
                select(DBACatalog).where(DBACatalog.codigo == item["codigo"])
            )
            if existing:
                existing.area = AREA
                existing.grado = item["grado"]
                existing.descripcion = item["descripcion"]
                existing.fuente = FUENTE
                existing.activo = True
                updated += 1
            else:
                db.add(
                    DBACatalog(
                        area=AREA,
                        grado=item["grado"],
                        codigo=item["codigo"],
                        descripcion=item["descripcion"],
                        fuente=FUENTE,
                        activo=True,
                    )
                )
                created += 1
        await db.commit()
    return created, updated


def main() -> None:
    created, updated = asyncio.run(seed())
    print(f"DBA Ciencias Naturales primaria: created={created} updated={updated}")


if __name__ == "__main__":
    main()
