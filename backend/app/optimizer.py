"""Carton design & pallet loading optimizer.

Pure-Python brute-force port of the validated Jupyter notebook
(originally a Gurobi MIP; the search space here is tiny enough that plain
enumeration finds the exact same optimum with no solver dependency).

Every function here mirrors a notebook function 1:1 -- same constraints,
same formulas, same defaults. See the notebook for the worked derivation.
"""
import itertools

# Standard 48in x 40in pallet footprint, in mm^2 -- used only for the
# "% of pallet area used" metric. Independent of the (possibly oversized)
# working pallet_l/pallet_w, so it reflects utilization of the true
# standard footprint.
STANDARD_PALLET_L_MM = 48 * 25.4  # 1219.2mm
STANDARD_PALLET_W_MM = 40 * 25.4  # 1016.0mm
STANDARD_PALLET_AREA_MM2 = STANDARD_PALLET_L_MM * STANDARD_PALLET_W_MM


def orientations(a, b, c):
    """All 6 permutations of a box's 3 dims, deduplicated."""
    return sorted(set(itertools.permutations([a, b, c])))


def divisor_triples(n):
    """All (x, y, z) with x*y*z == n, x >= y >= z >= 1."""
    triples = set()
    for x in range(1, n + 1):
        if n % x:
            continue
        rem = n // x
        for y in range(1, rem + 1):
            if rem % y:
                continue
            z = rem // y
            triples.add(tuple(sorted([x, y, z], reverse=True)))
    return sorted(triples)


def carton_fits(x, l1, y, w1, z, h1, rule, margin_L, margin_W, margin_H,
                 L_max=None, W_max=None, H_max=None, cascading_max=None):
    """Check a candidate (x,y,z) unit-count assignment against the chosen
    carton max-size rule. Returns (fits: bool, carton_l, carton_w, carton_h).

    rule == "independent" (storage cost saving): each carton dimension
    independently capped at L_max/W_max/H_max.

    rule == "cascading" (larger carton): only the longest side is capped,
    at cascading_max; the other two just have to be <= the side ordered
    before them (L >= W >= H).
    """
    cl = x * l1 + margin_L
    cw = y * w1 + margin_W
    ch = z * h1 + margin_H
    if rule == "independent":
        fits = cl <= L_max and cw <= W_max and ch <= H_max
    elif rule == "cascading":
        fits = cl <= cascading_max and cw <= cl and ch <= cw
    else:
        raise ValueError("carton_rule must be 'independent' or 'cascading'")
    return fits, cl, cw, ch


def carton_weight_estimate(units, carton_l, carton_w, carton_h, unit_weight):
    surface_area = carton_l * carton_w + carton_l * carton_h + carton_w * carton_h
    return unit_weight * units + surface_area * 2 * (0.004 / 2500)


def carton_designs_fixed_N(l, w, h, N, rule, margin_L, margin_W, margin_H,
                            L_max=None, W_max=None, H_max=None, cascading_max=None):
    """Mirrors carton_packing_model: for each inner-box orientation, find
    every (x, y, z) with x*y*z == N and x >= y >= z that fits the carton
    max-size rule."""
    seen = set()
    designs = []
    for (l1, w1, h1) in orientations(l, w, h):
        for (x, y, z) in divisor_triples(N):
            fits, cl, cw, ch = carton_fits(x, l1, y, w1, z, h1, rule,
                                            margin_L, margin_W, margin_H,
                                            L_max, W_max, H_max, cascading_max)
            if not fits:
                continue
            key = (l1, w1, h1, x, y, z, cl, cw, ch)
            if key in seen:
                continue
            seen.add(key)
            designs.append({
                "box_l": l1, "box_w": w1, "box_h": h1,
                "x_num": x, "y_num": y, "z_num": z,
                "units_per_carton": N,
                "carton_length": cl, "carton_width": cw, "carton_height": ch,
            })
    return designs


def pallet_stage(carton_list, pallet_l, pallet_w, pallet_h_limit, max_rows_per_layer=2):
    """Mirrors pallet_optimizer: for each candidate carton, try all 6
    orientations on the pallet, fit as many as possible along each axis,
    and keep every feasible arrangement (not just the best), sorted by
    total units descending.

    Same filter as the original: keep only arrangements where the carton's
    height isn't its largest side (pallet_l_l >= pallet_h_h and
    pallet_w_w >= pallet_h_h).

    Plus the accessibility filter: keep a layout only if at least one of
    the two layer axes (l or w) has <= max_rows_per_layer rows of cartons,
    so nothing is trapped in the middle of the layer, unreachable without
    unstacking.
    """
    all_rows = []
    for carton in carton_list:
        cl, cw, ch = carton["carton_length"], carton["carton_width"], carton["carton_height"]
        units_per_carton = carton["units_per_carton"]
        for (pl, pw, ph) in orientations(cl, cw, ch):
            if pl < ph or pw < ph:
                continue
            a = int(pallet_l // pl)
            b = int(pallet_w // pw)
            c = int(pallet_h_limit // ph)
            total = a * b * c * units_per_carton
            if total <= 0:
                continue
            footprint_area = a * b * pl * pw
            footprint_pct = 100 * footprint_area / STANDARD_PALLET_AREA_MM2
            row = dict(carton)
            row.update({
                "pallet_l_l": pl, "pallet_w_w": pw, "pallet_h_h": ph,
                "pallet_l_num": a, "pallet_w_num": b, "pallet_h_num": c,
                "pallet_total_units": total,
                "pallet_footprint_pct": round(footprint_pct, 1),
            })
            all_rows.append(row)

    combos_evaluated = len(all_rows)
    accessible = [r for r in all_rows
                  if r["pallet_l_num"] <= max_rows_per_layer or r["pallet_w_num"] <= max_rows_per_layer]
    combos_dropped_accessibility = combos_evaluated - len(accessible)
    accessible.sort(key=lambda r: r["pallet_total_units"], reverse=True)
    return accessible, combos_evaluated, combos_dropped_accessibility


def maximize_mode_search(l, w, h, unit_weight, rule, margin_L, margin_W, margin_H,
                          pallet_l, pallet_w, pallet_h_limit,
                          max_units_per_carton, carton_weight_cap,
                          L_max=None, W_max=None, H_max=None, cascading_max=None,
                          max_rows_per_layer=2):
    """Mirrors carton_designer_pallet_maximizer: for each inner-box
    orientation, search x,y,z (units per carton axis) and a,b,c (cartons
    per pallet axis) jointly, subject to the carton max-size rule, the
    units-per-carton cap, the corrugate weight cap, and pallet fit.
    Every feasible combo is kept (not just the best), then filtered for
    accessibility and sorted by total units descending.
    """
    all_rows = []
    for (l1, w1, h1) in orientations(l, w, h):
        if rule == "independent":
            x_max = int((L_max - margin_L) // l1)
            y_max = int((W_max - margin_W) // w1)
            z_max = int((H_max - margin_H) // h1)
        else:  # cascading
            x_max = int((cascading_max - margin_L) // l1)
            y_max = int((cascading_max - margin_W) // w1)
            z_max = int((cascading_max - margin_H) // h1)
        x_max, y_max, z_max = max(x_max, 0), max(y_max, 0), max(z_max, 0)

        for x in range(1, x_max + 1):
            for y in range(1, y_max + 1):
                for z in range(1, z_max + 1):
                    units = x * y * z
                    if units > max_units_per_carton:
                        continue
                    fits, cl, cw, ch = carton_fits(x, l1, y, w1, z, h1, rule,
                                                    margin_L, margin_W, margin_H,
                                                    L_max, W_max, H_max, cascading_max)
                    if not fits:
                        continue
                    weight = carton_weight_estimate(units, cl, cw, ch, unit_weight)
                    if weight > carton_weight_cap:
                        continue
                    a = int(pallet_l // cl)
                    b = int(pallet_w // cw)
                    c = int(pallet_h_limit // ch)
                    total = a * b * c * units
                    if total <= 0:
                        continue
                    footprint_area = a * b * cl * cw
                    footprint_pct = 100 * footprint_area / STANDARD_PALLET_AREA_MM2
                    all_rows.append({
                        "box_l": l1, "box_w": w1, "box_h": h1,
                        "x_num": x, "y_num": y, "z_num": z,
                        "units_per_carton": units,
                        "carton_length": cl, "carton_width": cw, "carton_height": ch,
                        "carton_weight_lb": round(weight, 2),
                        "pallet_l_l": cl, "pallet_w_w": cw, "pallet_h_h": ch,
                        "pallet_l_num": a, "pallet_w_num": b, "pallet_h_num": c,
                        "pallet_total_units": total,
                        "pallet_footprint_pct": round(footprint_pct, 1),
                    })

    combos_evaluated = len(all_rows)
    accessible = [r for r in all_rows
                  if r["pallet_l_num"] <= max_rows_per_layer or r["pallet_w_num"] <= max_rows_per_layer]
    combos_dropped_accessibility = combos_evaluated - len(accessible)
    accessible.sort(key=lambda r: r["pallet_total_units"], reverse=True)
    return accessible, combos_evaluated, combos_dropped_accessibility


def run_optimizer(box, mode, N, max_units_per_carton, carton_weight_cap,
                   margin, carton_rule, carton_max_independent, carton_max_cascading,
                   pallet, max_rows_per_layer):
    l, w, h = box["l"], box["w"], box["h"]
    unit_weight = box["unit_weight"]
    margin_L, margin_W, margin_H = margin["L"], margin["W"], margin["H"]
    L_max, W_max, H_max = carton_max_independent["L"], carton_max_independent["W"], carton_max_independent["H"]
    pallet_l, pallet_w, pallet_h_limit = pallet["l"], pallet["w"], pallet["h_limit"]

    if mode == "fixed_N":
        carton_list = carton_designs_fixed_N(
            l, w, h, N, carton_rule, margin_L, margin_W, margin_H,
            L_max=L_max, W_max=W_max, H_max=H_max, cascading_max=carton_max_cascading,
        )
        results, combos_evaluated, combos_dropped = pallet_stage(
            carton_list, pallet_l, pallet_w, pallet_h_limit, max_rows_per_layer,
        )
    elif mode == "maximize":
        results, combos_evaluated, combos_dropped = maximize_mode_search(
            l, w, h, unit_weight, carton_rule, margin_L, margin_W, margin_H,
            pallet_l, pallet_w, pallet_h_limit,
            max_units_per_carton, carton_weight_cap,
            L_max=L_max, W_max=W_max, H_max=H_max, cascading_max=carton_max_cascading,
            max_rows_per_layer=max_rows_per_layer,
        )
    else:
        raise ValueError("mode must be 'fixed_N' or 'maximize'")

    return {
        "combos_evaluated": combos_evaluated,
        "combos_dropped_accessibility": combos_dropped,
        "results": results[:15],
        "best": results[0] if results else None,
    }
