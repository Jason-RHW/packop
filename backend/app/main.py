import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.optimizer import run_optimizer
from app.schemas import OptimizeRequest

app = FastAPI(title="Carton Design & Pallet Loading Optimizer")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5175")
cors_origins = {frontend_url, "http://localhost:5175", "http://127.0.0.1:5175"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/optimize")
def optimize(req: OptimizeRequest):
    if req.mode == "fixed_N" and not req.N:
        raise HTTPException(status_code=422, detail="N is required when mode is 'fixed_N'")

    result = run_optimizer(
        box=req.box.model_dump(),
        mode=req.mode,
        N=req.N,
        max_units_per_carton=req.max_units_per_carton,
        carton_weight_cap=req.carton_weight_cap,
        margin=req.margin.model_dump(),
        carton_rule=req.carton_rule,
        carton_max_independent=req.carton_max_independent.model_dump(),
        carton_max_cascading=req.carton_max_cascading,
        pallet=req.pallet.model_dump(),
        max_rows_per_layer=req.max_rows_per_layer,
    )
    if result["best"] is None:
        raise HTTPException(status_code=422, detail="No feasible arrangement found for these inputs.")
    return result
