"""Dependency-free DOCX preflight shared by storage and isolated conversion."""
from io import BytesIO
import re
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

class _DocumentXMLBuilder(ElementTree.TreeBuilder):
    def doctype(self, name, pubid, system):
        # Parser-level rejection also covers UTF-16 encoded declarations.
        raise ValueError("El documento contiene XML no permitido.")


def validate_docx(content: bytes) -> None:
    _validate_package(content, depth=0, remaining=[80 * 1024 * 1024])


def _validate_package(content: bytes, *, depth: int, remaining: list[int]) -> None:
    if depth > 2:
        raise ValueError("El documento contiene demasiados archivos incrustados; conviértelo a PDF.")
    try:
        with ZipFile(BytesIO(content)) as archive:
            entries = archive.infolist()
            names = [entry.filename for entry in entries]
            required = {"[Content_Types].xml", "word/document.xml"} if depth == 0 else {"[Content_Types].xml"}
            if len(entries) > 2000 or len(set(names)) != len(names) or not required <= set(names):
                raise ValueError("El documento Word no tiene una estructura válida.")
            expanded = sum(entry.file_size for entry in entries)
            if expanded > remaining[0]:
                raise ValueError("El documento Word supera el límite al descomprimirse.")
            remaining[0] -= expanded
            for entry in entries:
                name = entry.filename
                if entry.flag_bits & 1 or name.startswith(("/", "\\")) or ".." in name.replace("\\", "/").split("/"):
                    raise ValueError("El documento contiene archivos no permitidos.")
                if "vbaproject" in name.lower() or name.lower().endswith((".bin", ".exe")):
                    raise ValueError("No se permiten macros ni objetos ejecutables.")
                data = archive.read(entry)  # Bounded expansion above; checks ZIP CRC.
                if data.startswith(b"PK\x03\x04"):
                    _validate_package(data, depth=depth + 1, remaining=remaining)
                elif name.lower().endswith((".xml", ".rels", ".svg")):
                    if len(data) > 4 * 1024 * 1024 or b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
                        raise ValueError("El documento contiene XML no permitido.")
                    root = ElementTree.fromstring(data, parser=ElementTree.XMLParser(target=_DocumentXMLBuilder()))
                    if any(element.attrib.get("TargetMode", "").lower() == "external" for element in root.iter()):
                        raise ValueError("El documento contiene vínculos externos; elimínalos antes de cargarlo.")
                    instructions = "".join(element.text or "" for element in root.iter() if element.tag.rsplit("}", 1)[-1] == "instrText")
                    instructions += " " + " ".join(value for element in root.iter() for key, value in element.attrib.items() if key.rsplit("}", 1)[-1] == "instr")
                    if re.search(r"\b(?:DDE(?:AUTO)?|INCLUDETEXT|INCLUDEPICTURE|LINK|DATABASE)\b", instructions, re.IGNORECASE):
                        raise ValueError("El documento contiene campos externos o comandos; conviértelo a PDF antes de cargarlo.")
                    for element in root.iter():
                        if element.tag.rsplit("}", 1)[-1].lower() in {"script", "foreignobject"}:
                            raise ValueError("El documento contiene contenido activo no permitido.")
                        for key, value in element.attrib.items():
                            attribute = key.rsplit("}", 1)[-1].lower()
                            if attribute == "contenttype" and "macroenabled" in value.lower():
                                raise ValueError("No se permiten documentos con macros.")
                            if attribute in {"target", "href"} and (re.match(r"^[a-z][a-z0-9+.-]*:", value, re.IGNORECASE) or value.startswith(("//", "\\\\"))):
                                raise ValueError("El documento contiene referencias externas no permitidas.")
    except (BadZipFile, ElementTree.ParseError, RuntimeError, KeyError) as exc:
        raise ValueError("No pudimos abrir el documento Word.") from exc
