import { useEffect, useRef, useState } from 'react'

const FADE_SECONDS = 1.2

type Props = {
  src: string
  poster?: string
  className?: string
}

/**
 * Background video that loops without a visible seam.
 *
 * Even a clip whose first and last frames match shows a hitch on the native
 * `loop` boundary, because the decoder stalls while it seeks back to zero. So
 * we run two copies of the same clip and cross-fade from the one that is
 * ending into one that has already started playing — the swap happens while
 * both are decoding, so there is nothing to stall on.
 */
export default function LoopingVideo({ src, poster, className = '' }: Props) {
  const layers = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)]
  const [front, setFront] = useState(0)
  const handingOver = useRef(false)

  useEffect(() => {
    const active = layers[front].current
    const standby = layers[front === 0 ? 1 : 0].current
    if (!active || !standby) return

    const onTime = () => {
      if (handingOver.current || !active.duration) return
      if (active.duration - active.currentTime > FADE_SECONDS) return

      handingOver.current = true
      standby.currentTime = 0
      void standby.play()
      setFront((f) => (f === 0 ? 1 : 0))
    }

    active.addEventListener('timeupdate', onTime)
    return () => active.removeEventListener('timeupdate', onTime)
  }, [front])

  useEffect(() => {
    handingOver.current = false
    // Park the outgoing layer once it has faded out, ready for its next turn.
    const outgoing = layers[front === 0 ? 1 : 0].current
    const t = setTimeout(() => {
      if (outgoing) {
        outgoing.pause()
        outgoing.currentTime = 0
      }
    }, FADE_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [front])

  return (
    <>
      {layers.map((ref, i) => (
        <video
          key={i}
          ref={ref}
          className={`${className} absolute inset-0 transition-opacity ease-linear`}
          style={{
            opacity: i === front ? 1 : 0,
            transitionDuration: `${FADE_SECONDS * 1000}ms`,
          }}
          src={src}
          poster={i === 0 ? poster : undefined}
          autoPlay={i === 0}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      ))}
    </>
  )
}
