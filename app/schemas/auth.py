from pydantic import BaseModel


class SessionResponse(BaseModel):
    authenticated: bool = True
    # True: el administrador tiene MFA y aún debe verificar su código.
    mfa_requerido: bool = False


class MfaSetupResponse(BaseModel):
    secreto: str
    otpauth_url: str


class MfaVerificarPayload(BaseModel):
    codigo: str


class NumeroCuentaLogin(BaseModel):
    numero_cuenta: str