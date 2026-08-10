from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class NumeroCuentaLogin(BaseModel):
    numero_cuenta: str