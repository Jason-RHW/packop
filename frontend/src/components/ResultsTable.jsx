import { lengthSuffix, formatLength } from '../units.js'
import { t } from '../i18n.js'

export default function ResultsTable({ results, units, lang }) {
  const hasWeight = results.some((r) => r.carton_weight_lb != null)
  const suf = lengthSuffix(units)
  const L = (mm) => formatLength(mm, units)
  const T = (key, vars) => t(lang, key, vars)

  return (
    <div className="panel">
      <h2 className="panel-title">{T('topCombos', { n: results.length })}</h2>
      <div className="results-table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{T('thBoxLWH', { suf })}</th>
              <th>{T('thCartonLoading')}</th>
              <th>{T('thUnitsPerCarton')}</th>
              <th>{T('thCartonLWH', { suf })}</th>
              {hasWeight && <th>{T('thWeight')}</th>}
              <th>{T('thPalletABC')}</th>
              <th>{T('thFootprint')}</th>
              <th>{T('thTotalUnits')}</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td><span className="rank-badge">{i + 1}</span></td>
                <td>{L(r.box_l)}×{L(r.box_w)}×{L(r.box_h)}</td>
                <td>{r.x_num}x{r.y_num}x{r.z_num}</td>
                <td>{r.units_per_carton}</td>
                <td>{L(r.carton_length)}×{L(r.carton_width)}×{L(r.carton_height)}</td>
                {hasWeight && <td>{r.carton_weight_lb ?? '—'}</td>}
                <td>{r.pallet_l_num}×{r.pallet_w_num}×{r.pallet_h_num}</td>
                <td>{r.pallet_footprint_pct}%</td>
                <td>{r.pallet_total_units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
