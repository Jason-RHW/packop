# Carton & Pallet Loading Optimizer

Web calculator for the carton-design / pallet-loading brute-force optimizer
(ported from the validated Gurobi notebooks — same constraints, same math,
no solver license required).

## Run locally

**Backend** (FastAPI, port 8010):
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

**Frontend** (Vite/React, port 5175):
```
cd frontend
npm install
npm run dev
```

Then open http://localhost:5175. The frontend calls the backend at
`http://localhost:8010` by default — override with `VITE_API_URL` in a
`.env.local` file under `frontend/` if deploying separately.

## How it works

- Every one of the 6 orientations of the inner box, and every orientation
  of the resulting carton on the pallet, is enumerated — nothing is assumed.
- Two carton-fill modes: `fixed_N` (exact units per carton, you choose N)
  and `maximize` (auto-fills the carton, respecting a weight cap and a
  150-unit/carton cap).
- Two carton max-size rules: `independent` ("storage cost saving" — three
  fixed per-axis caps) and `cascading` ("larger carton" — only the longest
  side is capped, the other two must be <= the side before them).
- An accessibility filter drops any layer layout that's more than 2 rows
  deep on *both* the length and width axes, since cartons boxed in on all
  sides can't be reached without unstacking.
- `pallet_footprint_pct` reports one carton layer's footprint against the
  true standard 48"x40" pallet, independent of any oversizing allowance
  built into the working pallet dimensions.

See `backend/app/optimizer.py` for the algorithm itself.
