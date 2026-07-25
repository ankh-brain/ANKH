import SectionHeading from './SectionHeading'
import TaskCard from './TaskCard'

const STEPS = [
  {
    n: '01',
    title: 'Brief',
    body: 'Tell Sol the goal — or point it at your site and let it propose one.',
  },
  {
    n: '02',
    title: 'Plan',
    body: 'Strategy writes the month against that goal. Research keeps it honest, daily.',
  },
  {
    n: '03',
    title: 'Draft',
    body: 'Each specialist works its own lane and attaches an estimate before you look.',
  },
  {
    n: '04',
    title: 'Ship & attribute',
    body: 'Approved work goes live, then reports back which number it moved.',
  },
]

export default function Loop() {
  return (
    <section id="how" className="bg-ground px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The loop"
          title="Nothing lands without a reason attached"
          lede="The difference between a tool that drafts and a team you trust is that the team tells you why — before you approve, not after it flops."
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          <ol className="flex flex-col">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`grid grid-cols-[3rem_1fr] gap-x-5 py-7 ${
                  i > 0 ? 'border-t border-hairline' : 'pt-0'
                }`}
              >
                <span className="num label pt-1.5 text-flame">{s.n}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="display text-2xl leading-tight text-ink md:text-[28px]">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-4">
            <span className="label text-ink-soft/60">What lands in your queue</span>
            <TaskCard
              channel="SEO"
              channelTone="bg-emerald-100 text-emerald-700"
              estimate="est. +30 clicks/wk"
              eta="in 2h"
              title="2 keyword gaps worth owning"
              because="two keyword gaps have buyers searching and no good answer yet."
              confidence="High confidence"
            />
            <TaskCard
              channel="LinkedIn"
              channelTone="bg-blue-100 text-blue-700"
              estimate="est. +900 impr"
              eta="in 2h"
              title="Founder post draft"
              because="founder-voice posts pull 3.1x brand voice with this audience."
              confidence="High confidence"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
