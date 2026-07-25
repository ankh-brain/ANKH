import Logo from './Logo'

const FOOTER_LINKS = [
  { label: 'The roster', href: '#team' },
  { label: 'How it works', href: '#how' },
  { label: 'Control', href: '#control' },
  { label: 'Plans', href: '#plans' },
]

export default function Closing() {
  return (
    <footer id="about" className="bg-band px-6 pb-12 pt-24 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start gap-7 rounded-2xl bg-ink px-7 py-14 text-white md:px-14 md:py-20">
          <h2 className="display max-w-3xl text-3xl leading-[1.05] tracking-tight sm:text-4xl md:text-6xl">
            Monday morning, eight briefs already written
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            Point Sol at your site. It will come back with a north star, a
            month of work against it, and the first three drafts — before you
            have decided whether to hire anyone.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-flame px-6 py-3 text-sm font-semibold text-white shadow-[0px_4px_12px_rgba(242,107,29,0.35)] transition-all duration-300 hover:bg-flame-deep sm:px-8 sm:py-3.5"
            >
              Get Early Access
            </button>
            <a
              href="#"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/10 sm:py-3.5"
            >
              Hear Sol on a call
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="display text-xl text-ink">Axon</span>
          </div>
          <nav>
            <ul className="flex flex-wrap items-center gap-6">
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm font-medium text-ink-soft transition-colors duration-200 hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-sm text-ink-soft/70">
            © {new Date().getFullYear()} Axon Labs
          </p>
        </div>
      </div>
    </footer>
  )
}
