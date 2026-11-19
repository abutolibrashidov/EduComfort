from pydantic import BaseModel

class LoginRequest(BaseModel):
    login: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ForgotPasswordRequest(BaseModel):
    login: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
