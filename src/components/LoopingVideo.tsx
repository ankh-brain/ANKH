import { useEffect, useRef, useState } from 'react'

const FADE_SECONDS = 1.2

type Props = {
  src: string
  poster?: string
  /**
   * Playback speed. Below 1 slows the camera without re-rendering the clip —
   * the browser holds each frame longer rather than dropping any, so the motion
   * stays smooth. Going much under 0.5 starts to look steppy on a 24fps source.
   */
  playbackRate?: number
  className?: string
}

/**
 * Background video that loops without a visible seam.
 *
 * Native `loop` hitches at the boundary because the decoder stalls while it
 * seeks back to zero. So we run two copies of the same clip and cross-fade from
 * the one that is ending into one that has already started playing — the swap
 * happens while both are decoding, so there is nothing to stall on.
 *
 * Because of this the clip does NOT need its first and last frames to match.
 * Pinning both ends when generating the source only constrains the camera.
 */
export default function LoopingVideo({
  src,
  poster,
  playbackRate = 1,
  className = '',
}: Props) {
  const layers = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)]
  const [front, setFront] = useState(0)
  const handingOver = useRef(false)

  // playbackRate resets whenever a source loads, so reapply it on both layers.
  useEffect(() => {
    const apply = (v: HTMLVideoElement | null) => {
      if (v) v.playbackRate = playbackRate
    }
    layers.forEach((l) => {
      apply(l.current)
      l.current?.addEventListener('loadedmetadata', () => apply(l.current))
    })
  }, [playbackRate, src])

  useEffect(() => {
    const active = layers[front].current
    const standby = layers[front === 0 ? 1 : 0].current
    if (!active || !standby) return

    const onTime = () => {
      if (handingOver.current || !active.duration) return
      // currentTime is media time, so scale the trigger by the rate to keep the
      // cross-fade landing exactly as the clip runs out in wall-clock terms.
      const triggerAt = FADE_SECONDS * playbackRate
      if (active.duration - active.currentTime > triggerAt) return

      handingOver.current = true
      standby.currentTime = 0
      standby.playbackRate = playbackRate
      void standby.play()
      setFront((f) => (f === 0 ? 1 : 0))
    }

    active.addEventListener('timeupdate', onTime)
    return () => active.removeEventListener('timeupdate', onTime)
  }, [front, playbackRate])

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
