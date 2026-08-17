from typing import Literal, Optional
from pydantic import BaseModel


class Box(BaseModel):
    l: float
    w: float
    h: float
    unit_weight: float


class Margin(BaseModel):
    L: float = 15
    W: float = 15
    H: float = 15


class CartonMaxIndependent(BaseModel):
    L: float = 450
    W: float = 340
    H: float = 260


class Pallet(BaseModel):
    l: float = 1220
    w: float = 1017
    h_limit: float = 1752.6


class OptimizeRequest(BaseModel):
    box: Box
    mode: Literal["fixed_N", "maximize"] = "fixed_N"
    N: Optional[int] = 10
    max_units_per_carton: int = 150
    carton_weight_cap: float = 50
    margin: Margin = Margin()
    carton_rule: Literal["independent", "cascading"] = "independent"
    carton_max_independent: CartonMaxIndependent = CartonMaxIndependent()
    carton_max_cascading: float = 635
    pallet: Pallet = Pallet()
    max_rows_per_layer: int = 2
