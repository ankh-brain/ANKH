import SectionHeading from './SectionHeading'

const CONTROLS = [
  {
    title: 'Scoped credentials',
    body: 'Every worker gets least-privilege access to one process, issued per run and revocable in a single click.',
  },
  {
    title: 'Human in the loop',
    body: 'Set the thresholds where a worker must stop and ask. Nothing irreversible happens unattended.',
  },
  {
    title: 'Complete audit trail',
    body: 'Every click, every write, every decision and the reasoning behind it — exportable to your SIEM.',
  },
  {
    title: 'Your perimeter',
    body: 'Run in our cloud or inside your own VPC. Your data is never used to train a shared model.',
  },
]

export default function Security() {
  return (
    <section id="security" className="bg-ground px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            eyebrow="Security"
            title="Autonomy you can put a boundary around"
            lede="A worker with your credentials is only as good as the controls around it. So we built those first."
          />
        </div>

        <dl className="flex flex-col">
          {CONTROLS.map((c, i) => (
            <div
              key={c.title}
              className={`flex flex-col gap-2 py-7 ${
                i > 0 ? 'border-t border-[#1B133C]/10' : 'pt-0'
              }`}
            >
              <dt className="display text-2xl leading-tight text-[#1B133C]">
                {c.title}
              </dt>
              <dd className="text-sm leading-relaxed text-[#1B133C]/70">{c.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
