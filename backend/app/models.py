from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Player(SQLModel, table=True):
    __tablename__ = "players"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=32)
    platform: str = Field(default="steam", max_length=16)
    region: str = Field(default="pc-as", max_length=16, index=True)
    perspective: str = Field(default="tpp", max_length=8)
    ranked_mode: str = Field(default="squad", max_length=16)

    rank_points: int = Field(default=0, ge=0)
    wins: int = Field(default=0, ge=0)
    kills: int = Field(default=0, ge=0)
    games: int = Field(default=0, ge=0)

    created_at: datetime = Field(default_factory=utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=utc_now, nullable=False)

