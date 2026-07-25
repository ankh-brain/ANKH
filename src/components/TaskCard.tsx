type Props = {
  channel: string
  channelTone: string
  estimate: string
  eta: string
  title: string
  because: string
  confidence: string
  /** Auto-pilot ships without waiting; the card's footer changes to match. */
  autonomous?: boolean
}

/**
 * The artifact the product actually hands you: a queued task with its
 * reasoning attached. Rebuilt here in HTML rather than screenshotted, so it
 * stays legible at any width.
 */
export default function TaskCard({
  channel,
  channelTone,
  estimate,
  eta,
  title,
  because,
  confidence,
  autonomous = false,
}: Props) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-hairline bg-white p-5 shadow-[0px_1px_2px_rgba(27,19,60,0.04),0px_8px_24px_-12px_rgba(27,19,60,0.15)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`label rounded px-1.5 py-1 ${channelTone}`}>{channel}</span>
        <span className="rounded bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft">
          {estimate}
        </span>
        <span className="ml-auto text-[11px] text-ink-soft/70 num">{eta}</span>
      </div>

      <h4 className="text-[15px] font-semibold leading-snug text-ink">{title}</h4>

      <p className="text-[13px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Because: </span>
        {because}
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        {autonomous ? (
          <>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-up">
              <span className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden="true" />
              Shipped 07:12
            </span>
            <span className="text-[12px] text-ink-soft/80">· logged for review</span>
          </>
        ) : (
          <>
            <span className="rounded bg-flame px-3 py-1.5 text-[12px] font-semibold text-white">
              Approve
            </span>
            <span className="rounded px-3 py-1.5 text-[12px] font-medium text-ink-soft">
              Preview
            </span>
            <span className="rounded px-3 py-1.5 text-[12px] font-medium text-ink-soft">
              Edit
            </span>
          </>
        )}
        <span className="ml-auto text-[11px] font-medium text-ink-soft/70">
          {confidence}
        </span>
      </div>
    </article>
  )
}
