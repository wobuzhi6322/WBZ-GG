# Full-Stack Baseline Checklist (Next.js + FastAPI)

## Frontend (Next.js + TypeScript)
- [ ] `strict` TypeScript mode enabled (`tsconfig.json`)
- [ ] API response/request interfaces are centrally defined (`src/types/*`)
- [ ] API client wrapper uses generic return types (`Promise<T>`)
- [ ] Page/component props include explicit types
- [ ] Domain logic (`utils/lib`) has explicit return types

## Backend (FastAPI + Pydantic + SQLModel)
- [ ] All endpoint handlers include return type hints
- [ ] All service/CRUD functions include return type hints
- [ ] Request/response contracts are defined in Pydantic models
- [ ] DB table schema is defined in SQLModel
- [ ] DB session dependency is typed and centrally managed
- [ ] HTTP status codes and error responses are explicit

## Data Modeling Rules
- [ ] Input model (`Create/Update`) and output model (`Read`) are separated
- [ ] Validation constraints are defined (`Field`, `Literal`, `ge/le`, length limits)
- [ ] Computed fields (e.g. `win_rate`) are represented consistently in output schema
- [ ] API sort/filter/pagination query models are explicitly typed

## Quality Gates
- [ ] Frontend lint/build passes
- [ ] Backend import/run check passes (`uvicorn app.main:app --reload`)
- [ ] API schema is inspectable in Swagger/OpenAPI

