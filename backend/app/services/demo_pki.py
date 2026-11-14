"""PKI de demostración para el proveedor `local`: produce firma electrónica, sin valor de firma digital."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

CA_NAME = "Firmadoc Demo CA (sin valor legal)"
SIGNER_NAME = "Firmadoc - firma electrónica de demostración"


@dataclass(frozen=True)
class LocalKeystore:
    private_key: rsa.RSAPrivateKey
    certificate: x509.Certificate
    ca_certificate: x509.Certificate


def _name(common_name: str) -> x509.Name:
    return x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "AR"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Firmadoc Demo"),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ]
    )


def generate_local_keystore(now: datetime | None = None) -> LocalKeystore:
    now = now or datetime.now(UTC)

    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(_name(CA_NAME))
        .issuer_name(_name(CA_NAME))
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=False,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
        .sign(ca_key, hashes.SHA256())
    )

    signer_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    signer_cert = (
        x509.CertificateBuilder()
        .subject_name(_name(SIGNER_NAME))
        .issuer_name(ca_cert.subject)
        .public_key(signer_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=825))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=True,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.EMAIL_PROTECTION]), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False
        )
        .sign(ca_key, hashes.SHA256())
    )

    return LocalKeystore(private_key=signer_key, certificate=signer_cert, ca_certificate=ca_cert)


def save_local_keystore(keystore: LocalKeystore, path: Path, passphrase: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = pkcs12.serialize_key_and_certificates(
        name=b"firmadoc-local-signer",
        key=keystore.private_key,
        cert=keystore.certificate,
        cas=[keystore.ca_certificate],
        encryption_algorithm=serialization.BestAvailableEncryption(passphrase.encode("utf-8")),
    )
    path.write_bytes(data)
    path.with_name("demo-ca.crt").write_bytes(keystore.ca_certificate.public_bytes(serialization.Encoding.PEM))


def load_local_keystore(path: Path, passphrase: str) -> LocalKeystore:
    key, cert, cas = pkcs12.load_key_and_certificates(path.read_bytes(), passphrase.encode("utf-8"))
    if not isinstance(key, rsa.RSAPrivateKey) or cert is None or not cas:
        raise ValueError(f"El keystore {path} no contiene clave RSA, certificado y CA")
    return LocalKeystore(private_key=key, certificate=cert, ca_certificate=cas[0])
