import { useEffect, useMemo, useState } from 'react'
import './App.css'

const PACKAGES = [
  {
    name: '@venkateshmedipudi/react-theme-context',
    displayName: 'React Theme Context',
    homepage: 'https://www.npmjs.com/package/@venkateshmedipudi/react-theme-context',
  },
  {
    name: '@venkateshmedipudi/react-i18n-lite',
    displayName: 'React i18n Lite',
    homepage: 'https://www.npmjs.com/package/@venkateshmedipudi/react-i18n-lite',
  },
]

const PERIOD_OPTIONS = [
  { value: 'last-day', label: 'Last day' },
  { value: 'last-week', label: 'Last 7 days' },
  { value: 'last-month', label: 'Last 30 days' },
  { value: 'last-year', label: 'Last 12 months' },
]

const numberFormatter = new Intl.NumberFormat('en-US')

function App() {
  const [period, setPeriod] = useState('last-week')
  const [downloadTotals, setDownloadTotals] = useState({})
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let isCurrent = true

    async function fetchDownloads() {
      setStatus('loading')
      setError('')

      try {
        const results = await Promise.all(
          PACKAGES.map(async (pkg) => {
            const encodedName = encodeURIComponent(pkg.name)
            const response = await fetch(
              `https://api.npmjs.org/downloads/point/${period}/${encodedName}`,
              { signal: controller.signal },
            )

            let data = {}
            try {
              data = await response.json()
            } catch (jsonError) {
              console.warn('Unable to parse downloads payload', jsonError)
            }

            const errorMessage =
              typeof data === 'object' && data !== null ? String(data.error ?? '') : ''

            if (response.status === 404) {
              const isNoStats = errorMessage.toLowerCase().includes('no stats')
              if (isNoStats) {
                return [pkg.name, 0]
              }
            }

            if (!response.ok) {
              throw new Error(`Unable to fetch downloads for ${pkg.displayName}`)
            }

            return [pkg.name, data.downloads ?? 0]
          }),
        )

        if (!isCurrent) {
          return
        }

        setDownloadTotals(Object.fromEntries(results))
        setLastUpdated(new Date())
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted || !isCurrent) {
          return
        }

        console.error(err)
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setStatus('error')
      }
    }

    fetchDownloads()

    return () => {
      isCurrent = false
      controller.abort()
    }
  }, [period, refreshToken])

  const periodLabel = useMemo(
    () => PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? '',
    [period],
  )

  const isLoading = status === 'loading' && !Object.keys(downloadTotals).length

  const handleRefresh = () => {
    setRefreshToken(Date.now())
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="identity">
          <h1>Venkatesh Medipudi</h1>
          <a
            className="identity-link"
            href="https://www.linkedin.com/in/venkateshmedipudi"
            target="_blank"
            rel="noreferrer"
          >
            linkedin.com/in/venkateshmedipudi
          </a>
        </div>
        <button
          type="button"
          className="refresh-button"
          onClick={handleRefresh}
          disabled={status === 'loading'}
        >
          Refresh
        </button>
      </header>

      <section className="controls">
        <label className="control-group">
          <span>Time period</span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            disabled={status === 'loading'}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {lastUpdated ? (
          <span className="timestamp">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
      </section>

      {error ? (
        <div className="error-banner" role="alert">
          <strong>Heads up:</strong> {error}
        </div>
      ) : null}

      <section className="package-grid" aria-live="polite">
        {PACKAGES.map((pkg) => {
          const downloads = downloadTotals[pkg.name]
          return (
            <article key={pkg.name} className="package-card">
              <header>
                <a href={pkg.homepage} target="_blank" rel="noreferrer" className="package-name">
                  {pkg.name}
                </a>
                <span className="package-label">{pkg.displayName}</span>
              </header>

              <div className="download-count">
                {isLoading && downloads === undefined ? (
                  <span className="skeleton" aria-hidden="true" />
                ) : (
                  <>
                    <span className="count-value">
                      {downloads !== undefined ? numberFormatter.format(downloads) : '—'}
                    </span>
                    <span className="count-caption">downloads • {periodLabel}</span>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default App
