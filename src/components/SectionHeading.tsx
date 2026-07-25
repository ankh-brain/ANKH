type Props = {
  eyebrow: string
  title: string
  lede?: string
}

export default function SectionHeading({ eyebrow, title, lede }: Props) {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <span className="eyebrow text-[#1B133C]/45">{eyebrow}</span>
      <h2 className="display text-3xl sm:text-4xl md:text-5xl leading-[1.05] tracking-tight text-[#1B133C]">
        {title}
      </h2>
      {lede && (
        <p className="text-sm md:text-base leading-relaxed text-[#1B133C]/70">
          {lede}
        </p>
      )}
    </div>
  )
}
