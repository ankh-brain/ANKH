import { useState } from 'react'
import SectionHeading from './SectionHeading'
import TaskCard from './TaskCard'

const MODES = [
  {
    key: 'Ask first',
    body: 'Nothing moves without you. Every draft waits in the queue until you approve it — the right setting for month one, or a brand that cannot afford to be wrong.',
    autonomous: false,
  },
  {
    key: 'Co-pilot',
    body: 'You approve the work; the team handles the timing. Scheduling, budget pacing and reposting run themselves inside the caps you set.',
    autonomous: false,
  },
  {
    key: 'Auto-pilot',
    body: 'The team ships on its own inside your guardrails. You get the log, the attribution, and a stop button that works mid-flight.',
    autonomous: true,
  },
]

const GUARDRAILS = [
  {
    title: 'Brand voice lock',
    body: 'Trained on what you have already published. Off-voice drafts never reach your queue.',
  },
  {
    title: 'Budget caps',
    body: 'Daily and per-channel ceilings. Paid agents stop at the cap, not just after it.',
  },
  {
    title: 'Everything reversible',
    body: 'Every shipped asset keeps its draft, its author, and a one-click rollback.',
  },
  {
    title: 'The full log',
    body: 'Who shipped what, when, and the reasoning it acted on. Exportable to your stack.',
  },
]

export default function Control() {
  const [active, setActive] = useState(0)
  const mode = MODES[active]

  return (
    <section id="control" className="bg-band px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Control"
          title="Decide how much rope they get"
          lede="The same team, three levels of autonomy. Move the dial when they have earned it — not before."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
          <div className="flex flex-col gap-7">
            <div
              role="tablist"
              aria-label="Autonomy level"
              className="inline-flex w-fit rounded-xl border border-hairline bg-white p-1"
            >
              {MODES.map((m, i) => (
                <button
                  key={m.key}
                  role="tab"
                  type="button"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                    i === active
                      ? 'bg-ink text-white'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {m.key}
                </button>
              ))}
            </div>

            <p className="max-w-xl text-base leading-relaxed text-ink md:text-lg">
              {mode.body}
            </p>

            <dl className="grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2">
              {GUARDRAILS.map((g) => (
                <div key={g.title} className="flex flex-col gap-2 bg-white p-6">
                  <dt className="display text-xl leading-tight text-ink">
                    {g.title}
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink-soft">{g.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-4">
            <span className="label text-ink-soft/60">
              The same task, on {mode.key.toLowerCase()}
            </span>
            <TaskCard
              channel="Meta Ads"
              channelTone="bg-indigo-100 text-indigo-700"
              estimate="est. ~12 signups/wk"
              eta="in 2h"
              title="1 creative ready to run"
              because="your CAC target needs volume this week, capped at $50/day."
              confidence="Medium — needs 7d"
              autonomous={mode.autonomous}
            />
            <p className="text-xs leading-relaxed text-ink-soft/80">
              On auto-pilot the card skips your queue and reports what it did
              instead of asking what it should.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
