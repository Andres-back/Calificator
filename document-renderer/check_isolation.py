"""Run real synthetic DOCX conversion in a disposable, private Docker network.

No host ports, uploaded documents or credentials are passed to the converter.
The existing backend image supplies fixture/parser dependencies in a separate
network-disabled, read-only process. Output contains counts and timings only.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import time
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
CLIENT = """
import sys, urllib.request, urllib.error
body=sys.stdin.buffer.read()
request=urllib.request.Request('http://127.0.0.1:8080/convert',data=body,
    headers={'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
try:
    response=urllib.request.urlopen(request,timeout=55)
    sys.stdout.buffer.write(str(response.status).encode()+b'\\n'+response.read())
except urllib.error.HTTPError as error:
    sys.stdout.buffer.write(str(error.code).encode()+b'\\n'+error.read())
"""


def docker(*args, input=None, timeout=90):
    return subprocess.run(["docker", *args], input=input, capture_output=True, check=True, timeout=timeout).stdout


def fixture_process(image, code, *, content=None, network="none"):
    return docker("run", "--rm", "--network", network, "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=128m",
        "--env", "PYTHONDONTWRITEBYTECODE=1", "--env", "ENV=development",
        "--env", "SECRET_KEY=spec101-synthetic-test-secret-at-least-32-characters",
        "--mount", f"type=bind,source={ROOT / 'backend'},target=/app,readonly",
        "--workdir", "/app", "--entrypoint", "python", "--interactive", image,
        "-u", "-c", code, input=content)


def add_unsafe_part(content, name, value):
    target = BytesIO()
    with ZipFile(BytesIO(content)) as source, ZipFile(target, "w") as destination:
        for item in source.infolist():
            if item.filename != name:
                destination.writestr(item.filename, source.read(item))
        destination.writestr(name, value)
    return target.getvalue()


def validate_compose():
    # Verify the deployment definition too, not just this script's test flags.
    compose = json.loads(docker("compose", "--project-directory", str(ROOT), "--env-file", str(ROOT / ".env.example"),
                                "config", "--no-env-resolution", "--format", "json"))
    service = compose["services"]["document-renderer"]
    assert service["read_only"] and service["user"] == "10001:10001"
    assert service["cap_drop"] == ["ALL"] and service["pids_limit"] == 128
    assert not service.get("ports") and not service.get("env_file") and not service.get("volumes")
    assert set(service["networks"]) == {"document-rendering"}
    assert compose["networks"]["document-rendering"]["internal"]
    assert "document-rendering" in compose["services"]["worker-digitalization"]["networks"]


def check(image, backend_image):
    validate_compose()
    token = uuid4().hex[:12]
    network = None
    container = None
    try:
        network = docker("network", "create", "--internal", "--label", "xcalificator.test=spec101-renderer", "spec101-render-" + token).decode().strip()
        container = docker("run", "--detach", "--name", "spec101-render-" + token,
            "--label", "xcalificator.test=spec101-renderer", "--network", network, "--network-alias", "document-renderer",
            "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m,mode=1777",
            "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
            "--memory", "768m", "--cpus", "1", "--pids-limit", "128", image).decode().strip()
        deadline = time.monotonic() + 25
        while True:
            try:
                docker("exec", container, "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health',timeout=2).read()", timeout=5)
                break
            except subprocess.CalledProcessError:
                if time.monotonic() >= deadline:
                    raise RuntimeError("El conversor no inició correctamente")
                time.sleep(0.5)
        inspected = json.loads(docker("inspect", container))[0]
        host = inspected["HostConfig"]
        assert host["ReadonlyRootfs"] and host["CapDrop"] == ["ALL"]
        assert host["Memory"] == 768 * 1024 * 1024 and host["NanoCpus"] == 1_000_000_000 and host["PidsLimit"] == 128
        assert any(option.startswith("no-new-privileges") for option in host["SecurityOpt"])
        assert not host.get("PortBindings") and not any(mount["Type"] == "bind" for mount in inspected["Mounts"])
        assert json.loads(docker("network", "inspect", network))[0]["Internal"] is True
        docker("exec", container, "python", "-c", """
import os, socket, pathlib
assert os.getuid() != 0
assert not {'SECRET_KEY','DATABASE_URL','REDIS_URL','OPEN_CODE_API_KEY','OPENAI_API_KEY'} & set(os.environ)
try:
    pathlib.Path('/srv/write-probe').write_bytes(b'synthetic')
except OSError:
    pass
else:
    raise AssertionError('La raíz permite escritura')
try:
    connection=socket.create_connection(('1.1.1.1',443),timeout=2)
except OSError:
    pass
else:
    connection.close()
    raise AssertionError('El conversor tiene salida a Internet')
""")
        reports = []
        sample = None
        for constructor in ("word_embedded_tables", "word_native_tables"):
            source = fixture_process(backend_image,
                f"import sys; from tests.fixtures.evaluation_visuals import {constructor}; sys.stdout.buffer.write({constructor}().content)")
            started = time.monotonic()
            status, pdf = docker("exec", "-i", container, "python", "-c", CLIENT, input=source).split(b"\n", 1)
            assert status == b"200" and pdf.startswith(b"%PDF")
            duration = round(time.monotonic() - started, 3)
            report = json.loads(fixture_process(backend_image, """
import sys, json, fitz
with fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf') as document:
    text='\\n'.join(page.get_text() for page in document)
    assert '1.' in text and '6.' in text
    print(json.dumps({'pages':document.page_count,'image_uses':sum(len(page.get_image_info()) for page in document),
        'native_values_preserved':all(value in text for value in ['2400','2600','Precio'])}))
""", content=pdf))
            if constructor == "word_embedded_tables":
                assert report["image_uses"] >= 5
            else:
                assert report["native_values_preserved"]
            reports.append({"sample": constructor, "seconds": duration, **report})
            sample = source
        end_to_end = json.loads(fixture_process(backend_image, """
import asyncio, sys, json
from app.modules.evaluaciones.document_visual_extractor import extract_visual_document, DOCX_MIME
from tests.fixtures.evaluation_visuals import word_embedded_tables
async def main():
    result=await extract_visual_document(word_embedded_tables().content,DOCX_MIME)
    native=[element for element in result.elements if element.kind=='imagen' and element.anchor]
    assert len(native)==5 and all(element.asset_key in result.assets for element in native)
    assert len(result.pages)==2 and result.coverage.estado=='requiere_revision'
    print(json.dumps({'pages':len(result.pages),'native_image_uses':len(native),'coverage':result.coverage.estado}))
asyncio.run(main())
""", network=network))
        external = add_unsafe_part(sample, "word/_rels/document.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="unsafe" Target="http://127.0.0.1/private" TargetMode="External"/></Relationships>')
        macro = add_unsafe_part(sample, "word/vbaProject.bin", b"synthetic-not-executable")
        for rejected in (external, macro):
            status, _ = docker("exec", "-i", container, "python", "-c", CLIENT, input=rejected).split(b"\n", 1)
            assert status == b"422"
        docker("exec", container, "python", "-c", """
from pathlib import Path
assert not list(Path('/tmp').glob('xcal-render-*'))
assert not any(path.read_text().strip() in {'soffice.bin','oosplash'} for path in Path('/proc').glob('[0-9]*/comm'))
""")
        print(json.dumps({"isolation": "passed", "unsafe_inputs_rejected": 2, "conversions": reports, "extractor_end_to_end": end_to_end}, ensure_ascii=False))
    finally:
        # These are the exact IDs created above, never an enumerated user target.
        if container:
            docker("rm", "--force", container)
        if network:
            docker("network", "rm", network)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--backend-image", default="xcalificator-backend")
    args = parser.parse_args()
    check(args.image, args.backend_image)
