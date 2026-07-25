import SectionHeading from './SectionHeading'

const TEAM = [
  {
    name: 'Strategy',
    beat: 'The GTM plan',
    line: 'Writes the month week by week, and rewrites it when Research says the ground moved.',
    tone: 'bg-violet-100 text-violet-700',
  },
  {
    name: 'Research',
    beat: 'Market intel',
    line: 'Watches competitors, keywords and channels daily. Flags what changed while you slept.',
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    name: 'SEO',
    beat: 'Search + AI answers',
    line: 'Hunts the keyword gaps that have buyers searching and no good answer yet.',
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'Reply Guy',
    beat: 'Community',
    line: 'Finds threads gaining traction and drafts native replies before they cool off.',
    tone: 'bg-orange-100 text-orange-700',
  },
  {
    name: 'LinkedIn',
    beat: 'Founder voice',
    line: 'Drafts in your voice, not brand voice — it pulls 3.1x on the same audience.',
    tone: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'Design',
    beat: 'Creative',
    line: 'OG images and ad creative. Links without one get half the clicks, everywhere.',
    tone: 'bg-fuchsia-100 text-fuchsia-700',
  },
  {
    name: 'Meta Ads',
    beat: 'Paid growth',
    line: 'Buys signups under your target CAC and stops at the daily cap you set.',
    tone: 'bg-indigo-100 text-indigo-700',
  },
]

export default function Roster() {
  return (
    <section id="team" className="bg-band px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The roster"
          title="A marketing team, hired in an afternoon"
          lede="One lead who holds the whole picture, and seven specialists who only do their lane — and do it every single day."
        />

        {/* The lead gets the weight; the specialists read as a directory. */}
        <div className="mt-14 flex flex-col gap-7 rounded-2xl border border-hairline bg-white p-7 md:flex-row md:items-center md:gap-12 md:p-10">
          <div className="flex flex-col gap-3 md:w-72 md:shrink-0">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-up" aria-hidden="true" />
              <span className="label text-ink-soft">Online · voice</span>
            </span>
            <h3 className="display text-4xl leading-none text-ink md:text-5xl">Sol</h3>
            <span className="label text-flame">AI CMO</span>
          </div>
          <div className="flex flex-col gap-4">
            <p className="display text-xl leading-snug text-ink md:text-2xl">
              “Ask me anything about your plan, your numbers or your channels. I
              hold the full company brain.”
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Sol sets the north star, briefs every specialist, and decides which
              lever gets pulled next. Call it and it answers in a real voice —
              the same way you would ask a head of marketing on a Monday.
            </p>
          </div>
        </div>

        <dl className="mt-4 overflow-hidden rounded-2xl border border-hairline bg-white">
          {TEAM.map((m, i) => (
            <div
              key={m.name}
              className={`grid items-baseline gap-x-6 gap-y-2 p-6 md:grid-cols-[10rem_11rem_1fr] md:px-8 ${
                i > 0 ? 'border-t border-hairline' : ''
              }`}
            >
              <dt className="flex items-center gap-3">
                <span className={`label rounded px-1.5 py-1 ${m.tone}`}>
                  {m.name}
                </span>
              </dt>
              <dd className="display text-lg leading-tight text-ink">{m.beat}</dd>
              <dd className="text-sm leading-relaxed text-ink-soft">{m.line}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
