type Props = {
  eyebrow: string
  title: string
  lede?: string
}

export default function SectionHeading({ eyebrow, title, lede }: Props) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <span className="eyebrow text-flame">{eyebrow}</span>
      <h2 className="display text-3xl leading-[1.05] tracking-tight text-ink sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {lede && (
        <p className="text-sm leading-relaxed text-ink-soft md:text-base">{lede}</p>
      )}
    </div>
  )
}
