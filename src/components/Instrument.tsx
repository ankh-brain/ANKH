const TILES = [
  { label: 'Spend · 30d', value: '$2,064', delta: '+12%', tone: 'text-white/50' },
  { label: 'Clicks · 30d', value: '1,101', delta: 'CTR 0.8%', tone: 'text-white/50' },
  { label: 'Signups · 30d', value: '89', delta: '8% conv', tone: 'text-up' },
  { label: 'Blended CAC', value: '$23.19', delta: 'over target', tone: 'text-over' },
]

/**
 * Cuts straight from the hero to the product's control surface. The dark panel
 * is the one heavy element on the page — everything else stays light around it.
 */
export default function Instrument() {
  return (
    <section className="bg-ground px-6 pb-24 pt-20 md:pb-32">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-ink p-7 text-white md:p-10">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-7 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="label text-white/40">North star</span>
              <p className="display text-2xl md:text-3xl">
                Ranked in Google + AI answers
              </p>
            </div>
            <span className="num text-sm text-flame">15 / 60 · 25%</span>
          </div>

          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/4 rounded-full bg-flame" />
          </div>

          <p className="mt-5 text-sm leading-relaxed text-white/60">
            <span className="font-semibold text-white">Sol:</span> Your team
            shipped 7 pieces — I attribute ~89 signups so far. Next lever: the
            signup-page leak.
          </p>

          <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 lg:grid-cols-4">
            {TILES.map((t) => (
              <div key={t.label} className="flex flex-col gap-2 bg-ink p-5">
                <dt className="label text-white/40">{t.label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="num display text-3xl md:text-4xl">{t.value}</span>
                  <span className={`text-[11px] font-medium ${t.tone}`}>
                    {t.delta}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-ink-soft">
          Every number traces back to the task that moved it — and the agent that
          shipped it.
        </p>
      </div>
    </section>
  )
}
