"""Spec 185: correos de estudiante fáciles de dictar: apellido + iniciales.

«Daniel Felipe Mora Rosas» → ``moradf@xcalificator.com``. Con un solo nombre,
se usa completo: «Salomé Botina Guerrero» → ``botinasalome``. Si ya existe, se
añade 1, 2…

El nombre llega en un solo campo y en dos órdenes: las listas oficiales ponen
los apellidos primero («MEJIA JULIO WINDERLIS JOSAIN») y quien escribe a mano
suele poner los nombres primero. El orden se propone con una lista de nombres de
pila comunes; cuando no hay evidencia se supone el de las listas oficiales y se
marca como dudoso para que una persona lo revise.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata

DOMAIN = "xcalificator.com"
MAX_LOCAL = 40
PARTICLES = frozenset({"de", "del", "la", "las", "los", "y", "da", "das", "do", "dos", "san", "santa", "van", "von", "mac", "mc"})

# Nombres de pila frecuentes en Colombia (sin tildes, en minúsculas). Solo orientan
# el orden; un nombre ausente de la lista no se trata como apellido con certeza.
GIVEN_NAMES = frozenset("""
aaron abigail abraham adela adolfo adrian adriana agustin aida alan alba albeiro alberto alejandra alejandro alex
alexa alexander alexandra alexis alfonso alfredo alicia alirio alison alisson allison alma alonso alvaro amalia amanda
amelia ana anderson andrea andres angel angela angelica angie angy anibal antonella antonia antonio ariadna ariana
ariel armando arturo astrid aurora axel bairon barbara baltazar bayron beatriz belen benjamin bernardo betty bianca
blanca brahian brandon brayan brayhan breiner briyith bryan camila camilo candelaria carla carlos carmen carolina
catalina cecilia celeste cesar charlotte christian cindy clara claudia cristian cristina cristopher dahiana daniel
daniela danna danny dante dario david dayana deiby deisy derly diana diego dilan dolores dominic dorian duvan
dylan edgar edinson edison eduardo edwin elena eliana elias elizabeth elkin emanuel emiliano emilio emily emma
enrique erick erika ernesto esneider esperanza esteban estefania estefany estela estiven eva evelyn ezequiel fabian
fabio facundo federico felipe fernanda fernando flor francisco franco freddy gabriel gabriela genesis geraldine
gerardo german gilberto gisela gloria gonzalo greisy guadalupe guillermo gustavo hamilton hannah hector helen
henry hernan hilda hugo ian ignacio ines ingrid irene isaac isabel isabela isabella isaias ismael ivan ivon ivonne
jacobo jaider jair jaime jairo james jamir jan javier jeferson jefferson jeison jennifer jenny jeronimo jesus
jhoan jhojan jhon jhonatan jhonny joan joaquin johan johana johanna john johnny jonatan jorge jose josefa
josefina joseph josue juan juana julian juliana julieta julio justin karen karina karol kathe katherine
kevin laura laureano leandro leidy leider leonardo leonel leticia liam lian lida lina lisa lizeth lorena lucas
lucia luciana luis luisa luz manuel manuela marcela marco marcos margarita maria mariana mariangel maribel marina
mario marisol marlon marta martha martin martina mateo matias mauricio maximiliano mayerli melany melissa
mercedes miguel milena miriam moises monica natalia nataly nathalia nayeli nelson nestor nicol nicolas nicole
nidia nikol noah nohora norlys nubia octavio olga oliver olivia omar orlando oscar osvaldo ostin pablo paola
patricia paula paulina pedro rafael ramiro ramon raquel raul rebeca regina rene ricardo roberto rocio rodrigo
rosa rosalba ruben ruth salome samantha samuel sandra santiago sara saray sebastian sergio sharon sheyla silvia
simon sofia sol sonia stefania stefany steven susana tatiana teresa thiago tomas valentina valeria valery
vanessa vicente victor victoria violeta viviana walter wilmer wilson winderlis ximena xiomara yamile yaneth
yeimy yeison yenny yesenia yesid yessica yomar yuliana yurany zaira zoe josain leider estiven briyith
""".split())


@dataclass(frozen=True)
class Proposal:
    local: str
    surnames_first: bool
    doubtful: bool


def _fold(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in folded if not unicodedata.combining(char))


def _units(name: str) -> list[list[str]]:
    """Palabras del nombre; las partículas («de la», «del») se unen a la palabra siguiente."""
    words = [word for word in re.sub(r"[^a-z0-9 ]+", " ", _fold(name)).split() if word]
    units: list[list[str]] = []
    pending: list[str] = []
    for word in words:
        pending.append(word)
        if word not in PARTICLES:
            units.append(pending)
            pending = []
    if pending:
        if units:
            units[-1].extend(pending)
        else:
            units.append(pending)
    return units


def _head(unit: list[str]) -> str:
    """La palabra principal de una unidad: «de los angeles» → «angeles»."""
    return next((word for word in unit if word not in PARTICLES), unit[-1])


def _is_given(unit: list[str]) -> bool:
    return _head(unit) in GIVEN_NAMES


def _split(units: list[list[str]], surnames_first: bool) -> tuple[list[str], list[list[str]]]:
    """(primer apellido, nombres de pila) según el orden supuesto."""
    count = len(units)
    if count == 1:
        return units[0], []
    if surnames_first:
        if count == 2:
            return units[0], [units[1]]
        if count == 3:
            # «Perez Juan Carlos» (un apellido) frente a «Botina Guerrero Salome».
            return (units[0], units[1:]) if _is_given(units[1]) and _is_given(units[2]) else (units[0], units[2:])
        return units[0], units[2:]
    if count == 2:
        return units[1], [units[0]]
    if count == 3:
        # «Juan Carlos Perez» (un apellido) frente a «Salome Botina Guerrero».
        return (units[2], units[:2]) if _is_given(units[1]) else (units[1], units[:1])
    return units[-2], units[:-2]


def _guess_order(units: list[list[str]]) -> tuple[bool, bool]:
    """(apellidos primero, dudoso). Sin evidencia se supone el orden de las listas oficiales."""
    count = len(units)
    if count < 2:
        return True, True
    half = max(1, count // 2)
    head = sum(_is_given(unit) for unit in units[:half])
    tail = sum(_is_given(unit) for unit in units[count - half:])
    if tail > head:
        return True, False
    if head > tail:
        return False, False
    return True, True


def _compact(words: list[str]) -> str:
    return "".join(words)


def propose(name: str) -> Proposal:
    units = _units(name)
    if not units:
        return Proposal("estudiante", True, True)
    surnames_first, doubtful = _guess_order(units)
    surname, given = _split(units, surnames_first)
    if len(given) >= 2:
        suffix = "".join(_head(unit)[0] for unit in given)
    elif given:
        suffix = _compact([word for word in given[0] if word not in PARTICLES]) or _compact(given[0])
    else:
        suffix = ""
        doubtful = True
    local = (_compact(surname) + suffix)[:MAX_LOCAL] or "estudiante"
    return Proposal(local, surnames_first, doubtful)


def email_for(local: str, number: int = 0) -> str:
    return f"{local}{number or ''}@{DOMAIN}"


def first_free(local: str, taken: set[str]) -> str:
    """El primer correo libre: ``local``, ``local1``, ``local2``… (``taken`` en minúsculas)."""
    number = 0
    while email_for(local, number) in taken:
        number += 1
    return email_for(local, number)
