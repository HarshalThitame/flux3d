'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CirclePause, CirclePlay, Maximize2, RotateCcw, Smartphone } from 'lucide-react'
import styles from './InstagramAd.module.css'

const featureCards = [
  'Industrial Parts',
  'Prototypes',
  'Corporate Gifts',
]

const timelineMarks = [
  'Upload',
  'Print',
  'QC',
  'Ship',
]

type ReelVars = CSSProperties & Record<`--${string}`, number | string>

type InstagramAdClientProps = {
  isRecordMode?: boolean
}

export default function InstagramAdClient({ isRecordMode = false }: InstagramAdClientProps) {
  const [playbackKey, setPlaybackKey] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (isPaused) {
      video.pause()
    } else {
      void video.play().catch(() => undefined)
    }
  }, [isPaused, playbackKey])

  function replay() {
    setPlaybackKey((current) => current + 1)
    setIsPaused(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      void videoRef.current.play().catch(() => undefined)
    }
  }

  return (
    <main className={`${styles.page} ${isRecordMode ? styles.recordMode : ''}`}>
      <section className={styles.workspace} aria-label="Flux3D Instagram ad preview">
        <div
          key={playbackKey}
          className={`${styles.reel} ${isPaused ? styles.paused : ''}`}
          aria-label="15 second Flux3D Instagram reel advertisement"
        >
          <video
            ref={videoRef}
            className={styles.heroVideo}
            src="/printer2-optimized.mp4"
            poster="/printer2-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />

          <div className={styles.videoVeil} />
          <div className={styles.scanGrid} />
          <div className={styles.lightSweep} />

          <header className={styles.brandBar}>
            <Image
              src="/logo.webp"
              alt="Flux3D"
              width={180}
              height={48}
              priority
              className={styles.logo}
            />
            <span>Premium Prints</span>
          </header>

          <div className={styles.sceneBadge}>
            <span />
            Pan-India Delivery
          </div>

          <section className={styles.openingCopy} aria-label="Opening title">
            <p>Prototype to Premium Print</p>
            <h1>
              Premium
              <span>3D Printing</span>
            </h1>
          </section>

          <section className={styles.printStage} aria-label="3D print animation">
            <div className={styles.printerHead}>
              <span />
            </div>
            <div className={styles.modelGlow} />
            <div className={styles.modelWrap}>
              <Image
                src="/pot.webp"
                alt="Premium 3D printed model"
                width={520}
                height={520}
                className={styles.productImage}
                priority
              />
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className={styles.layerRing}
                  style={{ '--layer': index } as ReelVars}
                />
              ))}
            </div>
          </section>

          <section className={styles.featureStack} aria-label="Flux3D print categories">
            {featureCards.map((item, index) => (
              <article
                key={item}
                className={styles.featureCard}
                style={{ '--card': index } as ReelVars}
              >
                <span>0{index + 1}</span>
                {item}
              </article>
            ))}
          </section>

          <section className={styles.deliveryScene} aria-label="Delivery message">
            <div className={styles.routeLine}>
              {timelineMarks.map((mark, index) => (
                <span key={mark} style={{ '--dot': index } as ReelVars}>
                  {mark}
                </span>
              ))}
            </div>
            <h2>Delivered Across India</h2>
            <p>Upload your model. Get a clear quote. Receive a premium finish.</p>
          </section>

          <section className={styles.finalCta} aria-label="Final call to action">
            <Image
              src="/light logo.webp"
              alt="Flux3D"
              width={240}
              height={200}
              className={styles.finalLogo}
            />
            <h2>Print It With Flux3D</h2>
            <p>flux3d.in · WhatsApp 9623023480</p>
          </section>

          <footer className={styles.reelFooter}>
            <span>Quote-based pricing</span>
            <span>Pan-India</span>
            <span>Photo QC</span>
          </footer>
        </div>

        <aside className={styles.controls} aria-label="Preview controls">
          <div>
            <p className={styles.kicker}>Flux3D Reel Concept</p>
            <h2>15s premium Instagram ad</h2>
            <p>
              Built in a 9:16 frame with Flux3D assets, product motion, printer footage, and a
              clear DM/website CTA.
            </p>
          </div>

          <div className={styles.actionRow}>
            <button type="button" onClick={() => setIsPaused((current) => !current)}>
              {isPaused ? <CirclePlay aria-hidden="true" /> : <CirclePause aria-hidden="true" />}
              {isPaused ? 'Play' : 'Pause'}
            </button>
            <button type="button" onClick={replay}>
              <RotateCcw aria-hidden="true" />
              Replay
            </button>
            <a href="/instagram-ad?record=1" aria-label="Open clean recording view">
              <Maximize2 aria-hidden="true" />
              Record view
            </a>
          </div>

          <div className={styles.specBox}>
            <Smartphone aria-hidden="true" />
            <span>Format: 1080 x 1920 Reel / Story</span>
          </div>
        </aside>
      </section>
    </main>
  )
}
