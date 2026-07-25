import { useState, type FormEvent } from 'react'

/**
 * Where a submitted site is handed off. Point this at whatever actually
 * receives the lead — the app's onboarding, a form endpoint, your CRM.
 * The site is passed as the `site` query param.
 */
const HANDOFF_URL = 'https://ra-marketing.higgsfield.app/'

/** Accepts what people actually type: "acme.com", "www.acme.com", full URLs. */
function normalize(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    // Needs a dot and a TLD-ish tail to be a real host, not a typo.
    if (!/^[\w-]+(\.[\w-]+)+$/.test(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export default function SiteForm() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const site = normalize(value)
    if (!site) {
      setError('Enter a site like yourproduct.com')
      return
    }
    setError(null)
    window.location.href = `${HANDOFF_URL}?site=${encodeURIComponent(site)}`
  }

  return (
    <div className="mt-7 flex w-full max-w-xl flex-col items-center gap-3 sm:mt-8">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex w-full flex-col gap-2 rounded-2xl border border-flame/40 bg-white/85 p-2 backdrop-blur-sm shadow-[0px_4px_20px_rgba(27,19,60,0.08)] sm:flex-row sm:items-center sm:rounded-full sm:pl-6"
      >
        <label htmlFor="site" className="sr-only">
          Your website
        </label>
        <input
          id="site"
          name="site"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourproduct.com"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'site-error' : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink/35 focus:outline-none sm:px-0"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-flame px-6 py-3.5 text-sm font-semibold text-white shadow-[0px_4px_14px_rgba(242,107,29,0.35)] transition-colors duration-300 hover:bg-flame-deep sm:rounded-full sm:px-7"
        >
          Hire my CMO <span aria-hidden="true">→</span>
        </button>
      </form>

      <p
        id={error ? 'site-error' : undefined}
        role={error ? 'alert' : undefined}
        className={`text-xs sm:text-sm ${error ? 'font-medium text-over' : 'text-ink/55'}`}
      >
        {error ?? 'Takes 60 seconds. Nothing connects yet.'}
      </p>
    </div>
  )
}
