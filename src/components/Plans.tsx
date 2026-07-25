import SectionHeading from './SectionHeading'

const PLANS = [
  {
    name: 'Solo',
    price: '$1,200',
    cadence: '/month',
    note: 'One goal, one channel mix.',
    features: [
      'Sol plus three specialists',
      'One north-star goal at a time',
      'Approval queue with reasoning',
      'Attribution on every shipped task',
    ],
    cta: 'Start with one goal',
    featured: false,
  },
  {
    name: 'Growth',
    price: '$4,800',
    cadence: '/month',
    note: 'The full roster, all four goals running at once.',
    features: [
      'Everything in Solo',
      'All eight agents, every channel',
      'Paid budgets up to $25k/mo managed',
      'Co-pilot and auto-pilot modes',
      'Voice calls with Sol',
    ],
    cta: 'Get early access',
    featured: true,
  },
  {
    name: 'Agency',
    price: 'Custom',
    cadence: '',
    note: 'Every client brand, one control room.',
    features: [
      'Everything in Growth',
      'Unlimited brands and workspaces',
      'Per-client voice and guardrails',
      'White-label reporting',
      'Named strategist on call',
    ],
    cta: 'Talk to us',
    featured: false,
  },
]

export default function Plans() {
  return (
    <section id="plans" className="bg-ground px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Plans"
          title="Priced like a team, not a tool"
          lede="You are buying output — briefs written, drafts shipped, budgets managed. Not seats for people to log into."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <article
              key={p.name}
              className={`flex flex-col gap-6 rounded-2xl p-7 md:p-8 ${
                p.featured
                  ? 'bg-ink text-white shadow-[0px_16px_40px_-16px_rgba(27,19,60,0.4)]'
                  : 'border border-hairline bg-white'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h3
                    className={`label ${p.featured ? 'text-white/50' : 'text-ink-soft'}`}
                  >
                    {p.name}
                  </h3>
                  {p.featured && (
                    <span className="label rounded bg-flame px-2 py-1 text-white">
                      Most picked
                    </span>
                  )}
                </div>
                <p className="flex items-baseline gap-1">
                  <span
                    className={`display num text-4xl md:text-5xl ${
                      p.featured ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {p.price}
                  </span>
                  {p.cadence && (
                    <span
                      className={`text-sm ${p.featured ? 'text-white/50' : 'text-ink-soft'}`}
                    >
                      {p.cadence}
                    </span>
                  )}
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    p.featured ? 'text-white/70' : 'text-ink-soft'
                  }`}
                >
                  {p.note}
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      aria-hidden="true"
                      className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${
                        p.featured ? 'bg-flame' : 'bg-ink/25'
                      }`}
                    />
                    <span className={p.featured ? 'text-white/80' : 'text-ink-soft'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`mt-auto rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  p.featured
                    ? 'bg-flame text-white hover:bg-flame-deep'
                    : 'border border-ink/15 text-ink hover:bg-ink/5'
                }`}
              >
                {p.cta}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
