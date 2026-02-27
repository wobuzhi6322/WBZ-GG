from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Region = Literal["pc-as", "pc-sea", "pc-kakao", "pc-na", "pc-eu", "pc-oc", "pc-sa"]
Platform = Literal["steam", "kakao"]
Perspective = Literal["tpp", "fpp"]
RankedMode = Literal["solo", "duo", "squad"]


class PlayerBase(BaseModel):
    username: str = Field(min_length=2, max_length=32)
    platform: Platform = "steam"
    region: Region = "pc-as"
    perspective: Perspective = "tpp"
    ranked_mode: RankedMode = "squad"
    rank_points: int = Field(default=0, ge=0)
    wins: int = Field(default=0, ge=0)
    kills: int = Field(default=0, ge=0)
    games: int = Field(default=0, ge=0)


class PlayerCreate(PlayerBase):
    pass


class PlayerUpdate(BaseModel):
    platform: Platform | None = None
    region: Region | None = None
    perspective: Perspective | None = None
    ranked_mode: RankedMode | None = None
    rank_points: int | None = Field(default=None, ge=0)
    wins: int | None = Field(default=None, ge=0)
    kills: int | None = Field(default=None, ge=0)
    games: int | None = Field(default=None, ge=0)


class PlayerRead(PlayerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    win_rate: float
    created_at: datetime
    updated_at: datetime


class LeaderboardQuery(BaseModel):
    region: Region = "pc-as"
    limit: int = Field(default=50, ge=1, le=100)


class LeaderboardEntry(BaseModel):
    rank: int = Field(ge=1)
    username: str
    rank_points: int
    kills: int
    wins: int
    games: int
    win_rate: float


class RegionalHighlight(BaseModel):
    region: Region
    top_win_rate: LeaderboardEntry | None
    top_kills: LeaderboardEntry | None


class LeaderboardResponse(BaseModel):
    region: Region
    entries: list[LeaderboardEntry]
    highlights: list[RegionalHighlight]

