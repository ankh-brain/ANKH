import Logo from './Logo'

const FOOTER_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Plans', href: '#plans' },
  { label: 'Security', href: '#security' },
  { label: 'About', href: '#about' },
]

export default function Closing() {
  return (
    <footer id="about" className="bg-ground px-6 pb-12 pt-24 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start gap-7 rounded-xl border border-[#1B133C]/10 bg-white/70 backdrop-blur-sm px-7 py-14 md:px-14 md:py-20">
          <h2 className="display max-w-2xl text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight text-[#1B133C]">
            Nobody was hired to fill in forms
          </h2>
          <p className="max-w-xl text-sm md:text-base leading-relaxed text-[#1B133C]/70">
            Tell us the process that eats the most hours this week. We will show
            you the worker that runs it — built on your own screens, not a demo
            dataset.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-[#FEFEFE] px-6 sm:px-8 py-3 sm:py-3.5 text-sm font-semibold text-[#1B133C] shadow-[0px_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0px_6px_16px_rgba(0,0,0,0.2)] transition-all duration-300"
            >
              Get Early Access
            </button>
            <a
              href="#"
              className="rounded-xl border border-[#1B133C]/15 px-6 py-3 sm:py-3.5 text-sm font-semibold text-[#1B133C] hover:bg-[#1B133C]/5 transition-colors duration-300"
            >
              Talk to a founder
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-[#1B133C]/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="display text-xl text-[#1B133C]">Axon</span>
          </div>
          <nav>
            <ul className="flex flex-wrap items-center gap-6">
              {FOOTER_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm font-medium text-[#1B133C]/60 hover:text-[#1B133C] transition-colors duration-200"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-sm text-[#1B133C]/45">
            © {new Date().getFullYear()} Axon Labs
          </p>
        </div>
      </div>
    </footer>
  )
}
