# Auditoria Pro

Herramientas profesionales de auditoría contable.

## Estructura del Proyecto

```
auditoria-pro/
├── backend/          # API Python + FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── models/
│   │   └── services/
│   └── requirements.txt
└── frontend/         # UI Next.js + React
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── lib/
    │   └── types/
    └── package.json
```

## Requisitos

- Python 3.11+
- Node.js 18+
- Cuenta de Supabase

## Instalación

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus credenciales de Supabase
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Editar .env.local con tus credenciales
npm run dev
```

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
