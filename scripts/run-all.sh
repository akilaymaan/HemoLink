#!/usr/bin/env bash
# One-click quick start: setup (env, npm install, pip install, train ML) then run backend + frontend + ML.
# Run from project root: ./scripts/run-all.sh
# MongoDB: use cloud connection URL in backend/.env (MONGODB_URI).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== HemoLink one-click quick start ==="

# 1. Backend .env
if [ ! -f backend/.env ]; then
  echo "[setup] Creating backend/.env from .env.example"
  cp backend/.env.example backend/.env
  echo "         -> Edit backend/.env and set MONGODB_URI (cloud URL) and JWT_SECRET, then run this script again."
  exit 1
fi
echo "[setup] backend/.env ok"

# 2. npm install
echo "[setup] npm install (backend)"
(cd backend && npm install)
echo "[setup] npm install (frontend)"
(cd frontend && npm install)

# 3. ML service: venv + pip + train once
ML_DIR="$ROOT/backend/ml-service"
if [ ! -d "$ML_DIR/.venv" ]; then
  echo "[setup] Creating Python venv in backend/ml-service"
  (cd "$ML_DIR" && python3 -m venv .venv)
fi
echo "[setup] pip install (ml-service)"
(cd "$ML_DIR" && ./.venv/bin/pip install -q -r requirements.txt)
if [ ! -f "$ML_DIR/artifacts/eligibility_model.joblib" ]; then
  echo "[setup] Training ML model (first time)"
  (cd "$ML_DIR" && ./.venv/bin/python train_model.py)
else
  echo "[setup] ML artifacts present"
fi
if [ ! -f "$ML_DIR/.env" ]; then
  [ -f "$ML_DIR/.env.example" ] && cp "$ML_DIR/.env.example" "$ML_DIR/.env" && echo "[setup] Created ml-service/.env (add GEMINI_API_KEY for Gemini)"
fi

# 4. Start all services
echo ""
echo "Starting backend, frontend, and ML service..."
echo ""

(cd backend && npm run dev) &
BACKEND_PID=$!
sleep 1

(cd frontend && npm run dev) &
FRONTEND_PID=$!
sleep 1

(cd "$ML_DIR" && ./.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000) &
ML_PID=$!

cleanup() {
  echo ""
  echo "Stopping..."
  kill $BACKEND_PID $FRONTEND_PID $ML_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:5173  <- open in browser"
echo "ML:       http://localhost:8000"
echo ""
echo "Ctrl+C to stop all."
wait
