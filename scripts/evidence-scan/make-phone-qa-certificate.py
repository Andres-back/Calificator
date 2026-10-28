"""Two-day self-signed QA certificate, never trusted/installed system-wide."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import ipaddress
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def create(host: str) -> None:
    address = ipaddress.IPv4Address(host)
    if not address.is_private or address.is_unspecified or address.is_link_local:
        raise ValueError("Only loopback or authorized private IPv4")
    directory = Path(__file__).resolve().parents[2] / "tmp/spec131-phone-qa-tls"
    directory.mkdir(parents=True, exist_ok=True)
    if any(directory.iterdir()):
        raise ValueError("Existing QA certificate preserved; do not overwrite")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "XCalificator isolated local QA")])
    now = datetime.now(timezone.utc)
    certificate = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
        .serial_number(x509.random_serial_number()).not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=2)).add_extension(x509.SubjectAlternativeName([
            x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")), x509.IPAddress(address)]), critical=False)
        .sign(key, hashes.SHA256()))
    with (directory / "private-key.pem").open("xb") as stream:
        stream.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    with (directory / "certificate.pem").open("xb") as stream:
        stream.write(certificate.public_bytes(serialization.Encoding.PEM))
    print("Temporary local QA certificate created; not installed or trusted globally.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    create(parser.parse_args().host)
