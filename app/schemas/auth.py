from pydantic import BaseModel


class SessionResponse(BaseModel):
    authenticated: bool = True


class NumeroCuentaLogin(BaseModel):
    numero_cuenta: str