import Logo from './Logo'

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260714_113715_c7e0daa0-8bdd-4486-a2da-040901f8f0ea.mp4'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Plans', href: '#plans' },
  { label: 'Security', href: '#security' },
  { label: 'About', href: '#about' },
]

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex flex-col">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video
          className="w-full h-[130%] object-cover object-top"
          src={HERO_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Blends the video's bottom edge into the page ground below. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#FBFAFE]" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex justify-center pt-4 md:pt-6">
        <nav className="flex items-center gap-4 md:gap-8 bg-white/70 backdrop-blur-md rounded-xl px-4 md:px-6 py-3 shadow-sm">
          <a href="#" aria-label="Axon home" className="flex items-center">
            <Logo />
          </a>
          <ul className="hidden sm:flex items-center gap-6 md:gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm font-medium text-[#1B133C]/80 hover:text-[#1B133C] transition-colors duration-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Hero content */}
      <div className="relative z-10 mt-8 md:mt-16 flex flex-col items-center px-4 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[#1B133C]/10 bg-white/70 backdrop-blur-sm px-4 py-2 text-sm font-medium">
          <span className="flex w-5 h-5 items-center justify-center rounded bg-orange-500 text-xs font-bold text-white">
            Y
          </span>
          Funded by Y Combinator
        </div>

        <h1 className="font-['Instrument_Serif'] text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-[#1B133C] max-w-4xl">
          <span className="block">Deploy an AI workforce</span>
          <span className="block">for mundane workflows</span>
        </h1>

        <p className="mt-5 sm:mt-6 max-w-3xl text-xs sm:text-sm md:text-base leading-relaxed text-[#1B133C]/70">
          Put an AI workforce on the browser work that eats your team's day.
          Routine processes run themselves, so you add capacity without adding
          headcount — and deliver more for clients, effortlessly.
        </p>

        <button
          type="button"
          className="mt-7 sm:mt-8 rounded-xl bg-[#FEFEFE] px-6 sm:px-8 py-3 sm:py-3.5 text-sm font-semibold text-[#1B133C] shadow-[0px_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0px_6px_16px_rgba(0,0,0,0.2)] transition-all duration-300"
        >
          Get Early Access
        </button>
      </div>
    </section>
  )
}
