import { useLayoutEffect, useRef, useState } from 'react'
import Pallet3D from './Pallet3D.jsx'
import Carton3D from './Carton3D.jsx'
import { lengthSuffix, formatLength } from '../units.js'
import { t } from '../i18n.js'
import { STANDARD_L, STANDARD_W, PALLET_THICKNESS } from '../pallet-constants.js'

const MIN_CANVAS_HEIGHT = 320
const FALLBACK_CANVAS_HEIGHT = 700

function MetricTile({ label, value, sub, highlight, wide }) {
  return (
    <div className={`stat-tile${highlight ? ' highlight' : ''}${wide ? ' stat-tile-wide' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function BestArrangementCard({ data, units, lang }) {
  const { best } = data
  const [view, setView] = useState('pallet')
  const [canvasHeight, setCanvasHeight] = useState(FALLBACK_CANVAS_HEIGHT)
  const panelRef = useRef(null)
  const suf = lengthSuffix(units)
  const L = (mm) => formatLength(mm, units)
  const T = (key, vars) => t(lang, key, vars)

  const cartonsOnPallet = best.pallet_l_num * best.pallet_w_num * best.pallet_h_num
  const palletStackHeight = PALLET_THICKNESS + best.pallet_h_h * best.pallet_h_num
  const palletWeight = best.carton_weight_lb != null ? Math.round(best.carton_weight_lb * cartonsOnPallet * 10) / 10 : null

  // Keep this panel's total height matched to the input panel's. Both panels'
  // text scales with the page's fluid font-size (viewport-width-based), so a
  // fixed pixel height for the 3D window only lines up at one specific width --
  // measure and recompute instead, on every resize/content change.
  useLayoutEffect(() => {
    const leftPanel = document.querySelector('.main-grid > .panel')
    const rightPanel = panelRef.current
    const mount = rightPanel?.querySelector('.pallet3d-mount')
    if (!leftPanel || !rightPanel || !mount) return

    const recalc = () => {
      const leftH = leftPanel.getBoundingClientRect().height
      const rightH = rightPanel.getBoundingClientRect().height
      const mountH = mount.getBoundingClientRect().height
      const chrome = rightH - mountH
      const needed = Math.max(MIN_CANVAS_HEIGHT, Math.round(leftH - chrome))
      setCanvasHeight((prev) => (Math.abs(prev - needed) > 1 ? needed : prev))
    }

    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(leftPanel)
    ro.observe(rightPanel)
    window.addEventListener('resize', recalc)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalc)
    }
  }, [view, best, units, lang])

  return (
    <div className="panel" ref={panelRef}>
      <h2 className="panel-title">{T('bestArrangement')}</h2>

      <div className="metric-section">
        <h3 className="metric-section-title">{T('cartonSection')}</h3>
        <div className="metric-grid">
          <MetricTile
            label={T('cartonSize')}
            value={`${L(best.carton_length)} × ${L(best.carton_width)} × ${L(best.carton_height)}`}
            sub={suf}
          />
          <MetricTile
            label={T('cartonWeight')}
            value={best.carton_weight_lb != null ? `${best.carton_weight_lb}` : '—'}
            sub={best.carton_weight_lb != null ? T('lbPerCarton') : T('notTracked')}
          />
          <MetricTile label={T('unitsPerCarton')} value={best.units_per_carton} />
        </div>
      </div>

      <div className="metric-section">
        <h3 className="metric-section-title">{T('palletSection')}</h3>
        <div className="metric-grid metric-grid-3col">
          <MetricTile
            label={T('palletDimension')}
            value={`${L(STANDARD_L)} × ${L(STANDARD_W)} × ${L(palletStackHeight)}`}
            sub={suf}
            wide
          />
          <MetricTile
            label={T('palletWeight')}
            value={palletWeight != null ? `${palletWeight}` : '—'}
            sub={palletWeight != null ? T('lbUnit') : T('notTracked')}
          />
          <MetricTile
            label={T('cartonsPerPallet')}
            value={`${best.pallet_l_num} × ${best.pallet_w_num} × ${best.pallet_h_num}`}
            sub={`= ${cartonsOnPallet}`}
          />
          <MetricTile label={T('totalUnitsPallet')} value={best.pallet_total_units} />
          <MetricTile label={T('footprintUsed')} value={`${best.pallet_footprint_pct}%`} sub={T('vsStandard')} />
        </div>
      </div>

      <div className="viewer3d-wrap">
        <div className="units-toggle viewer3d-toggle">
          <button className={view === 'pallet' ? 'active' : ''} onClick={() => setView('pallet')}>
            {T('viewPallet')}
          </button>
          <button className={view === 'carton' ? 'active' : ''} onClick={() => setView('carton')}>
            {T('viewCarton')}
          </button>
        </div>
        {view === 'pallet' ? (
          <Pallet3D best={best} units={units} canvasHeight={canvasHeight} />
        ) : (
          <Carton3D best={best} units={units} canvasHeight={canvasHeight} />
        )}
      </div>
    </div>
  )
}
