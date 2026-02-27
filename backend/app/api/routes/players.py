from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session

from ...crud import create_player, delete_player, get_leaderboard, get_player, list_players, update_player
from ...db import get_session
from ...schemas import LeaderboardResponse, LeaderboardQuery, PlayerCreate, PlayerRead, PlayerUpdate, Region

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/", response_model=list[PlayerRead])
def get_players(
    session: Annotated[Session, Depends(get_session)],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[PlayerRead]:
    return list_players(session=session, limit=limit, offset=offset)


@router.post("/", response_model=PlayerRead, status_code=status.HTTP_201_CREATED)
def create_player_endpoint(
    payload: PlayerCreate,
    session: Annotated[Session, Depends(get_session)],
) -> PlayerRead:
    try:
        return create_player(session=session, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{player_id}", response_model=PlayerRead)
def get_player_endpoint(
    player_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> PlayerRead:
    player = get_player(session=session, player_id=player_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")
    return player


@router.patch("/{player_id}", response_model=PlayerRead)
def update_player_endpoint(
    player_id: int,
    payload: PlayerUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> PlayerRead:
    player = update_player(session=session, player_id=player_id, payload=payload)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")
    return player


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player_endpoint(
    player_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    deleted = delete_player(session=session, player_id=player_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/leaderboard/current", response_model=LeaderboardResponse, tags=["leaderboard"])
def get_current_leaderboard(
    session: Annotated[Session, Depends(get_session)],
    region: Region = Query(default="pc-as"),
    limit: int = Query(default=50, ge=1, le=100),
) -> LeaderboardResponse:
    query = LeaderboardQuery(region=region, limit=limit)
    return get_leaderboard(session=session, query=query)

