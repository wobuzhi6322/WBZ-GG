# WBZ Backend (FastAPI + Pydantic + SQLModel)

## Run
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload
```

## API Docs
- Swagger: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## Included Endpoints
- `GET /api/v1/health`
- `GET /api/v1/players`
- `POST /api/v1/players`
- `GET /api/v1/players/{player_id}`
- `PATCH /api/v1/players/{player_id}`
- `DELETE /api/v1/players/{player_id}`
- `GET /api/v1/players/leaderboard/current?region=pc-as&limit=50`

## Database
- Set `DATABASE_URL` to your database URL.
- 기본 개발 모드는 `sqlite:///./wbz.db`를 사용할 수 있습니다.
- 첫 실행 시 SQLModel 테이블(`players`)이 자동 생성됩니다.
- DB 연결 상태:
  - `GET /api/v1/health` -> `database: "ok" | "error"`

## Architecture Notes
- Every function includes type hints and explicit return type.
- API request/response shapes are defined with Pydantic models (`app/schemas.py`).
- Persistence model is defined with SQLModel (`app/models.py`).
- Business logic is split into CRUD/service layer (`app/crud.py`).
