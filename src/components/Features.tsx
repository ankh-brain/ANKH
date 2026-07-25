import SectionHeading from './SectionHeading'

const WORKERS = [
  {
    title: 'Data entry & migration',
    body: 'Moves records between systems that were never meant to talk to each other. Field-level validation on every write, so nothing lands half-finished.',
    wide: true,
  },
  {
    title: 'Research & enrichment',
    body: 'Fills the blanks on accounts, leads, and vendors — from the sources you approve, not the open web.',
  },
  {
    title: 'Reporting & reconciliation',
    body: 'Pulls the same numbers from the same places every week, and flags what moved before you have to ask.',
  },
  {
    title: 'Inbox & ticket triage',
    body: 'Reads, routes, and drafts. Escalates the handful that genuinely need a person.',
  },
  {
    title: 'Portal & form filing',
    body: 'Logs into the vendor portals that never shipped an API and files what is due, on time.',
  },
  {
    title: 'QA & spot checks',
    body: 'Reruns your checklist across every record and surfaces only the exceptions.',
  },
]

export default function Features() {
  return (
    <section id="features" className="bg-ground px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The workforce"
          title="Hire for the work nobody wants"
          lede="Each worker learns one process, runs it in the tools your team already uses, and hands back a result you can audit line by line."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WORKERS.map((w) => (
            <article
              key={w.title}
              className={`flex flex-col gap-3 rounded-xl border border-[#1B133C]/10 bg-white/70 backdrop-blur-sm p-6 md:p-7 transition-shadow duration-300 hover:shadow-[0px_4px_16px_rgba(27,19,60,0.07)] ${
                w.wide ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <h3 className="display text-2xl md:text-[28px] leading-tight text-[#1B133C]">
                {w.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#1B133C]/70">{w.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
