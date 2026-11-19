# EduComfort

```
backend/   FastAPI + SQLAlchemy + Alembic (Python 3.12)
frontend/  React + Vite
```

## Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # DATABASE_URL va SECRET_KEY ni to'ldiring
$env:PYTHONIOENCODING="utf-8"
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

> Alembic migratsiyalari PostgreSQL uchun yozilgan. Lokal SQLite bilan ishlaganda
> jadvallarni modellardan yarating va `alembic stamp head` qiling.

## Frontend

```powershell
cd frontend
npm install
echo VITE_API_URL=http://localhost:8000 > .env.development
npm run dev
```

http://localhost:5173
