import SectionHeading from './SectionHeading'

const PLANS = [
  {
    name: 'Pilot',
    price: '$2,400',
    cadence: '/month',
    note: 'One process, one worker.',
    features: [
      'A single workflow, fully deployed',
      'Shadow week before go-live',
      'Audit log and run history',
      'Email support',
    ],
    cta: 'Start a pilot',
    featured: false,
  },
  {
    name: 'Team',
    price: '$9,000',
    cadence: '/month',
    note: 'Up to ten workers across your operation.',
    features: [
      'Everything in Pilot',
      'Ten concurrent workers',
      'Scoped credential vault',
      'Slack channel with our engineers',
      'SSO and role-based access',
    ],
    cta: 'Get early access',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    note: 'Your VPC, your compliance review.',
    features: [
      'Everything in Team',
      'Unlimited workers',
      'Deploy inside your own VPC',
      'SIEM export and custom retention',
      'Named implementation lead',
    ],
    cta: 'Talk to us',
    featured: false,
  },
]

export default function Plans() {
  return (
    <section id="plans" className="bg-band px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Plans"
          title="Pay for output, not seats"
          lede="Workers are priced by the processes they run, so the bill tracks the work that came off your team's plate."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <article
              key={p.name}
              className={`flex flex-col gap-6 rounded-xl p-7 md:p-8 ${
                p.featured
                  ? 'bg-[#1B133C] text-white shadow-[0px_8px_28px_rgba(27,19,60,0.18)]'
                  : 'border border-[#1B133C]/10 bg-white/70 backdrop-blur-sm'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h3
                    className={`eyebrow ${p.featured ? 'text-white/60' : 'text-[#1B133C]/45'}`}
                  >
                    {p.name}
                  </h3>
                  {p.featured && (
                    <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Most picked
                    </span>
                  )}
                </div>
                <p className="flex items-baseline gap-1">
                  <span
                    className={`display text-4xl md:text-5xl tabular-nums ${
                      p.featured ? 'text-white' : 'text-[#1B133C]'
                    }`}
                  >
                    {p.price}
                  </span>
                  {p.cadence && (
                    <span
                      className={`text-sm ${p.featured ? 'text-white/60' : 'text-[#1B133C]/55'}`}
                    >
                      {p.cadence}
                    </span>
                  )}
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    p.featured ? 'text-white/70' : 'text-[#1B133C]/70'
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
                        p.featured ? 'bg-orange-500' : 'bg-[#1B133C]/30'
                      }`}
                    />
                    <span className={p.featured ? 'text-white/80' : 'text-[#1B133C]/70'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`mt-auto rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                  p.featured
                    ? 'bg-[#FEFEFE] text-[#1B133C] shadow-[0px_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0px_6px_16px_rgba(0,0,0,0.2)]'
                    : 'border border-[#1B133C]/15 text-[#1B133C] hover:bg-[#1B133C]/5'
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
