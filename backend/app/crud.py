from __future__ import annotations

from datetime import datetime, timezone
from typing import cast

from sqlmodel import Session, select

from .models import Player
from .schemas import (
    LeaderboardEntry,
    LeaderboardQuery,
    LeaderboardResponse,
    Perspective,
    Platform,
    PlayerCreate,
    PlayerRead,
    PlayerUpdate,
    RankedMode,
    RegionalHighlight,
    Region,
)

SUPPORTED_REGIONS: tuple[Region, ...] = ("pc-as", "pc-sea", "pc-kakao", "pc-na", "pc-eu", "pc-oc", "pc-sa")


def calculate_win_rate(wins: int, games: int) -> float:
    if games <= 0:
        return 0.0
    return round((wins / games) * 100.0, 2)


def to_player_read(player: Player) -> PlayerRead:
    return PlayerRead(
        id=player.id or 0,
        username=player.username,
        platform=cast(Platform, player.platform),
        region=cast(Region, player.region),
        perspective=cast(Perspective, player.perspective),
        ranked_mode=cast(RankedMode, player.ranked_mode),
        rank_points=player.rank_points,
        wins=player.wins,
        kills=player.kills,
        games=player.games,
        win_rate=calculate_win_rate(player.wins, player.games),
        created_at=player.created_at,
        updated_at=player.updated_at,
    )


def list_players(session: Session, limit: int = 100, offset: int = 0) -> list[PlayerRead]:
    stmt = select(Player).offset(offset).limit(limit).order_by(Player.id.desc())
    players = session.exec(stmt).all()
    return [to_player_read(player) for player in players]


def get_player(session: Session, player_id: int) -> PlayerRead | None:
    player = session.get(Player, player_id)
    if player is None:
        return None
    return to_player_read(player)


def get_player_by_username(session: Session, username: str) -> Player | None:
    stmt = select(Player).where(Player.username == username)
    return session.exec(stmt).first()


def create_player(session: Session, payload: PlayerCreate) -> PlayerRead:
    existing = get_player_by_username(session, payload.username)
    if existing is not None:
        raise ValueError(f"Username '{payload.username}' already exists.")

    player = Player(**payload.model_dump())
    session.add(player)
    session.commit()
    session.refresh(player)
    return to_player_read(player)


def update_player(session: Session, player_id: int, payload: PlayerUpdate) -> PlayerRead | None:
    player = session.get(Player, player_id)
    if player is None:
        return None

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(player, field_name, value)
    player.updated_at = datetime.now(timezone.utc)

    session.add(player)
    session.commit()
    session.refresh(player)
    return to_player_read(player)


def delete_player(session: Session, player_id: int) -> bool:
    player = session.get(Player, player_id)
    if player is None:
        return False

    session.delete(player)
    session.commit()
    return True


def build_ranked_entries(players: list[Player], limit: int) -> list[LeaderboardEntry]:
    sorted_players = sorted(
        players,
        key=lambda player: (
            player.rank_points,
            player.kills,
            calculate_win_rate(player.wins, player.games),
            player.wins,
        ),
        reverse=True,
    )

    ranked_entries: list[LeaderboardEntry] = []
    for index, player in enumerate(sorted_players[:limit], start=1):
        ranked_entries.append(
            LeaderboardEntry(
                rank=index,
                username=player.username,
                rank_points=player.rank_points,
                kills=player.kills,
                wins=player.wins,
                games=player.games,
                win_rate=calculate_win_rate(player.wins, player.games),
            )
        )

    return ranked_entries


def get_ranked_players_for_region(session: Session, region: Region) -> list[Player]:
    stmt = (
        select(Player)
        .where(Player.platform == "steam")
        .where(Player.region == region)
        .where(Player.perspective == "tpp")
        .where(Player.ranked_mode == "squad")
    )
    return session.exec(stmt).all()


def build_region_highlight(session: Session, region: Region, limit: int) -> RegionalHighlight:
    players = get_ranked_players_for_region(session, region)
    entries = build_ranked_entries(players, limit)

    top_win_rate = sorted(
        entries,
        key=lambda entry: (entry.win_rate, entry.games, entry.wins),
        reverse=True,
    )[0] if entries else None
    top_kills = sorted(entries, key=lambda entry: (entry.kills, entry.win_rate), reverse=True)[0] if entries else None

    return RegionalHighlight(region=region, top_win_rate=top_win_rate, top_kills=top_kills)


def get_leaderboard(session: Session, query: LeaderboardQuery) -> LeaderboardResponse:
    players = get_ranked_players_for_region(session, query.region)
    entries = build_ranked_entries(players, query.limit)
    highlights = [build_region_highlight(session, region, query.limit) for region in SUPPORTED_REGIONS]
    return LeaderboardResponse(region=query.region, entries=entries, highlights=highlights)
