import SectionHeading from './SectionHeading'

const STEPS = [
  {
    n: '01',
    title: 'Show it once',
    body: 'Record yourself doing the task, or point us at the SOP you already wrote. No scripting, no six-month integration project.',
  },
  {
    n: '02',
    title: 'Watch the shadow run',
    body: 'The worker drafts its plan and runs alongside your team for a week. You approve exactly what it is allowed to touch.',
  },
  {
    n: '03',
    title: 'Put it to work',
    body: 'Turn it live. It runs on a schedule or on a trigger, and every action it takes lands in an audit log.',
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-band px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="How it works"
          title="From process to production in a week"
          lede="The onboarding your team would give a new hire, compressed — minus the six weeks of shadowing."
        />

        {/* Numbered because this genuinely is a sequence. */}
        <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-[#1B133C]/10 bg-[#1B133C]/10 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-3 bg-[#FBFAFE] p-7 md:p-8">
              <span className="eyebrow text-orange-500 tabular-nums">{s.n}</span>
              <h3 className="display text-2xl md:text-[28px] leading-tight text-[#1B133C]">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#1B133C]/70">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
