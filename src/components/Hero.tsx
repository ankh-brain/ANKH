import Logo from './Logo'
import LoopingVideo from './LoopingVideo'
import SiteForm from './SiteForm'

/**
 * 10s, 1920x1080, forward aerial travel.
 *
 * Seeded from a still as the FIRST frame only. An earlier cut pinned the same
 * still as the last frame too, which forced the camera back to its origin and
 * flattened the shot into a near-still image. LoopingVideo cross-fades the
 * seam, so the clip does not need matching endpoints — don't pin the end frame.
 */
const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_388ZoOS6inn6vSmXTWLmRgxtMfT/hf_20260725_152524_1b902ad3-414c-4726-ba44-07dc96f5bf55.mp4'

/** Shown while the video buffers, so the hero never flashes empty. */
const HERO_POSTER_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_388ZoOS6inn6vSmXTWLmRgxtMfT/hf_20260725_150927_dd674473-23ae-4ac4-a4a2-54bfb83b77ae.png'

const NAV_LINKS = [
  { label: 'Team', href: '#' },
  { label: 'How it works', href: '#' },
  { label: 'Control', href: '#' },
  { label: 'Plans', href: '#' },
]

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex flex-col">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <LoopingVideo
          src={HERO_VIDEO_URL}
          poster={HERO_POSTER_URL}
          // The render's camera travels faster than a hero wants. Slowing
          // playback calms it without another generation: 10s of clip becomes
          // ~17s of drift.
          playbackRate={0.6}
          className="w-full h-[130%] object-cover object-top"
        />
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
                  className="text-sm font-medium text-ink/80 hover:text-ink transition-colors duration-200"
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
        <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/70 backdrop-blur-sm px-4 py-2 text-sm font-medium">
          <span className="flex w-5 h-5 items-center justify-center rounded bg-orange-500 text-xs font-bold text-white">
            Y
          </span>
          Funded by Y Combinator
        </div>

        <h1 className="font-['Instrument_Serif'] text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-ink max-w-5xl">
          <span className="block">An AI marketing team</span>
          <span className="block">that ships every day</span>
        </h1>

        <p className="mt-5 sm:mt-6 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-ink/70">
          Sol runs your go-to-market like a CMO — sets the north star, briefs
          every channel, and drops each draft in your queue with the reasoning
          attached. You approve. The team ships.
        </p>

        <SiteForm />
      </div>
    </section>
  )
}
