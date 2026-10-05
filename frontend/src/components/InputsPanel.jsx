import { lengthSuffix, mmToDisplay, displayToMm } from '../units.js'
import { t } from '../i18n.js'

function NumField({ label, value, onChange, step = 1, suffix, placeholder }) {
  return (
    <div>
      <label className="field-label">{label}{suffix ? ` (${suffix})` : ''}</label>
      <input
        type="number"
        value={value}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </div>
  )
}

function LengthField({ label, mmValue, onChangeMm, units, placeholderMm }) {
  const suffix = lengthSuffix(units)
  const step = units === 'imperial' ? 0.01 : 1
  return (
    <div>
      <label className="field-label">{label} ({suffix})</label>
      <input
        type="number"
        value={mmToDisplay(mmValue, units)}
        step={step}
        placeholder={placeholderMm != null ? String(mmToDisplay(placeholderMm, units)) : undefined}
        onChange={(e) => {
          const raw = e.target.value === '' ? '' : Number(e.target.value)
          onChangeMm(displayToMm(raw, units))
        }}
      />
    </div>
  )
}

function Section({ num, title, caption, children }) {
  return (
    <div className="field-section">
      <div className="section-head">
        <span className="section-num">{num}</span>
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="section-caption">{caption}</p>
        </div>
      </div>
      <div className="field-group">{children}</div>
    </div>
  )
}

export default function InputsPanel({ form, setForm, onRun, running, error, units, lang }) {
  const L = (key, vars) => t(lang, key, vars)

  const set = (path, value) => {
    setForm((prev) => {
      const next = structuredClone(prev)
      let cursor = next
      for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]]
      cursor[path[path.length - 1]] = value
      return next
    })
  }

  return (
    <div className="panel">
      <Section num="01" title={L('secInnerBoxTitle')} caption={L('secInnerBoxCaption')}>
        <div className="field-row">
          <LengthField label={L('length')} units={units} mmValue={form.box.l} placeholderMm={255} onChangeMm={(v) => set(['box', 'l'], v)} />
          <LengthField label={L('width')} units={units} mmValue={form.box.w} placeholderMm={140} onChangeMm={(v) => set(['box', 'w'], v)} />
          <LengthField label={L('height')} units={units} mmValue={form.box.h} placeholderMm={110} onChangeMm={(v) => set(['box', 'h'], v)} />
        </div>
        <NumField label={L('unitWeight')} suffix="lb" step={0.1} value={form.box.unit_weight} placeholder="5" onChange={(v) => set(['box', 'unit_weight'], v)} />
      </Section>

      <Section num="02" title={L('secFillModeTitle')} caption={L('secFillModeCaption')}>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${form.mode === 'fixed_N' ? 'active' : ''}`}
            onClick={() => set(['mode'], 'fixed_N')}
          >
            <strong>{L('fixedN')}</strong>
            {L('fixedNSub')}
          </button>
          <button
            className={`toggle-btn ${form.mode === 'maximize' ? 'active' : ''}`}
            onClick={() => set(['mode'], 'maximize')}
          >
            <strong>{L('maximize')}</strong>
            {L('maximizeSub')}
          </button>
        </div>
        {form.mode === 'fixed_N' ? (
          <NumField label={L('unitsPerCartonN')} value={form.N} placeholder="10" onChange={(v) => set(['N'], v)} />
        ) : (
          <div className="field-row two">
            <NumField label={L('maxUnitsPerCarton')} value={form.max_units_per_carton} placeholder="150" onChange={(v) => set(['max_units_per_carton'], v)} />
            <NumField label={L('cartonWeightCap')} suffix="lb" value={form.carton_weight_cap} placeholder="50" onChange={(v) => set(['carton_weight_cap'], v)} />
          </div>
        )}
      </Section>

      <Section num="03" title={L('secMarginTitle')} caption={L('secMarginCaption')}>
        <div className="field-row">
          <LengthField label={L('marginL')} units={units} mmValue={form.margin.L} onChangeMm={(v) => set(['margin', 'L'], v)} />
          <LengthField label={L('marginW')} units={units} mmValue={form.margin.W} onChangeMm={(v) => set(['margin', 'W'], v)} />
          <LengthField label={L('marginH')} units={units} mmValue={form.margin.H} onChangeMm={(v) => set(['margin', 'H'], v)} />
        </div>
      </Section>

      <Section num="04" title={L('secRuleTitle')} caption={L('secRuleCaption')}>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${form.carton_rule === 'independent' ? 'active' : ''}`}
            onClick={() => set(['carton_rule'], 'independent')}
          >
            <strong>{L('storageSaving')}</strong>
            {L('storageSavingSub')}
          </button>
          <button
            className={`toggle-btn ${form.carton_rule === 'cascading' ? 'active' : ''}`}
            onClick={() => set(['carton_rule'], 'cascading')}
          >
            <strong>{L('largerCarton')}</strong>
            {L('largerCartonSub')}
          </button>
        </div>
        {form.carton_rule === 'independent' ? (
          <div className="field-row">
            <LengthField label={L('lMax')} units={units} mmValue={form.carton_max_independent.L} onChangeMm={(v) => set(['carton_max_independent', 'L'], v)} />
            <LengthField label={L('wMax')} units={units} mmValue={form.carton_max_independent.W} onChangeMm={(v) => set(['carton_max_independent', 'W'], v)} />
            <LengthField label={L('hMax')} units={units} mmValue={form.carton_max_independent.H} onChangeMm={(v) => set(['carton_max_independent', 'H'], v)} />
          </div>
        ) : (
          <LengthField label={L('longestSideMax')} units={units} mmValue={form.carton_max_cascading} onChangeMm={(v) => set(['carton_max_cascading'], v)} />
        )}
      </Section>

      <Section num="05" title={L('secPalletTitle')} caption={L('secPalletCaption')}>
        <div className="field-row">
          <LengthField label={L('length')} units={units} mmValue={form.pallet.l} onChangeMm={(v) => set(['pallet', 'l'], v)} />
          <LengthField label={L('width')} units={units} mmValue={form.pallet.w} onChangeMm={(v) => set(['pallet', 'w'], v)} />
          <LengthField label={L('heightLimit')} units={units} mmValue={form.pallet.h_limit} onChangeMm={(v) => set(['pallet', 'h_limit'], v)} />
        </div>
      </Section>

      <Section num="06" title={L('secAccessTitle')} caption={L('secAccessCaption')}>
        <NumField label={L('maxRowsDeep')} value={form.max_rows_per_layer} onChange={(v) => set(['max_rows_per_layer'], v)} />
      </Section>

      <button className="run-btn" onClick={onRun} disabled={running}>
        {running ? L('computingBtn') : L('runOptimizer')}
      </button>
      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}
