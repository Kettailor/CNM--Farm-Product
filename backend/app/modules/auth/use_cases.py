from dataclasses import dataclass

from fastapi import HTTPException


@dataclass(frozen=True)
class AuthUser:
    email: str
    full_name: str
    password: str
    role: str


class InMemoryAuthRepository:
    def __init__(self) -> None:
        self._users: dict[str, AuthUser] = {}

    def get_by_email(self, email: str) -> AuthUser | None:
        return self._users.get(email.lower())

    def save(self, user: AuthUser) -> None:
        self._users[user.email.lower()] = user


class RegisterUseCase:
    def __init__(self, repository: InMemoryAuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str, full_name: str, password: str, role: str) -> dict[str, str]:
        normalized_email = email.lower()
        if self.repository.get_by_email(normalized_email):
            raise HTTPException(status_code=409, detail='User already exists')

        user = AuthUser(
            email=normalized_email,
            full_name=full_name,
            password=password,
            role=role,
        )
        self.repository.save(user)

        return {
            'message': 'Register successful',
            'email': user.email,
            'fullName': user.full_name,
            'role': user.role,
        }


class LoginUseCase:
    def __init__(self, repository: InMemoryAuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str, password: str) -> dict[str, str]:
        normalized_email = email.lower()
        user = self.repository.get_by_email(normalized_email)

        if not user or user.password != password:
            raise HTTPException(status_code=401, detail='Invalid email or password')

        return {
            'message': 'Login successful',
            'accessToken': f'demo-token-{user.email}',
            'fullName': user.full_name,
            'role': user.role,
        }
