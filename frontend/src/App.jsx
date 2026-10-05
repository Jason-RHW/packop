import { useEffect, useState } from 'react'
import InputsPanel from './components/InputsPanel.jsx'
import BestArrangementCard from './components/BestArrangementCard.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import { optimize } from './api.js'
import { t } from './i18n.js'

const DEFAULT_FORM = {
  box: { l: '', w: '', h: '', unit_weight: '' },
  mode: 'fixed_N',
  N: '',
  max_units_per_carton: '',
  carton_weight_cap: '',
  margin: { L: 15, W: 15, H: 15 },
  carton_rule: 'independent',
  carton_max_independent: { L: 450, W: 340, H: 260 },
  carton_max_cascading: 635,
  pallet: { l: 1220, w: 1017, h_limit: 1752.6 },
  max_rows_per_layer: 2,
}

export default function App() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [units, setUnits] = useState('metric')
  const [lang, setLang] = useState('en')

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const handleRun = async () => {
    const positive = (v) => typeof v === 'number' && v > 0
    const { box } = form
    const boxOk = [box.l, box.w, box.h, box.unit_weight].every(positive)
    const fillOk = form.mode === 'fixed_N'
      ? positive(form.N)
      : positive(form.max_units_per_carton) && positive(form.carton_weight_cap)
    if (!boxOk || !fillOk) {
      setError(t(lang, 'fillRequired'))
      return
    }
    setRunning(true)
    setError(null)
    try {
      // Fields belonging to the inactive fill mode are blank; the API still
      // needs valid numbers for them, so send its defaults (they're ignored).
      const payload = {
        ...form,
        N: form.mode === 'fixed_N' ? form.N : 10,
        max_units_per_carton: form.mode === 'maximize' ? form.max_units_per_carton : 150,
        carton_weight_cap: form.mode === 'maximize' ? form.carton_weight_cap : 50,
      }
      const data = await optimize(payload)
      setResult(data)
    } catch (e) {
      setError(e.message === 'No feasible arrangement found for these inputs.' ? t(lang, 'noFeasible') : e.message)
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="app-shell" data-lang={lang}>
      <div className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32">
            <path d="M16 4 L27 9.5 L27 22.5 L16 28 L5 22.5 L5 9.5 Z" fill="none" stroke="#eaf3ff" strokeWidth="1.4"/>
            <path d="M16 4 L16 16 M16 16 L27 9.5 M16 16 L5 9.5" fill="none" stroke="#eaf3ff" strokeWidth="1" opacity="0.6"/>
          </svg>
          <div className="brand-text">
            <h1>{t(lang, 'appTitle')}</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="units-toggle">
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <button
              className={lang === 'zh' ? 'active' : ''}
              onClick={() => setLang('zh')}
            >
              中
            </button>
          </div>
          <div className="units-toggle">
            <button
              className={units === 'metric' ? 'active' : ''}
              onClick={() => setUnits('metric')}
            >
              mm
            </button>
            <button
              className={units === 'imperial' ? 'active' : ''}
              onClick={() => setUnits('imperial')}
            >
              in
            </button>
          </div>
        </div>
      </div>

      <div className="main-grid">
        <InputsPanel form={form} setForm={setForm} onRun={handleRun} running={running} error={error} units={units} lang={lang} />

        <div>
          {!result && (
            <div className="panel">
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 32 32">
                  <path d="M16 4 L27 9.5 L27 22.5 L16 28 L5 22.5 L5 9.5 Z" fill="none" stroke="#eaf3ff" strokeWidth="1"/>
                </svg>
                <div>{t(lang, 'emptyState')}</div>
              </div>
            </div>
          )}

          {result && <BestArrangementCard data={result} units={units} lang={lang} />}
        </div>
      </div>

      {result && (
        <div className="full-width-panel">
          <ResultsTable results={result.results} units={units} lang={lang} />
        </div>
      )}

      <div className="footer-note">
        {t(lang, 'footerNote')}
      </div>
    </div>
  )
}
