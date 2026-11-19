import enum


class Provider(str, enum.Enum):
    LOCAL = "local"
    TOKEN = "token"
    FIRMAR = "firmar"


class SigningStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_SIGNATURE = "pending_signature"
    SIGNED = "signed"


class VersionOrigin(str, enum.Enum):
    UPLOADED = "uploaded"
    SIGNED = "signed"


class SignatureLevel(str, enum.Enum):
    B_B = "B-B"
    B_T = "B-T"
    B_LT = "B-LT"
    B_LTA = "B-LTA"


class SignatureRequestStatus(str, enum.Enum):
    PENDING = "pending"
    SIGNING = "signing"
    SIGNED = "signed"
    FAILED = "failed"


class RevocationStatus(str, enum.Enum):
    GOOD = "good"
    REVOKED = "revoked"
    UNKNOWN = "unknown"


class WebhookStatus(str, enum.Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
