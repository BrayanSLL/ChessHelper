let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') _ctx = new AudioContext()
  return _ctx
}

function playNoise(duration: number, cutoff: number, gain: number, delayMs = 0) {
  const fire = () => {
    try {
      const ac = getCtx()
      const n = Math.ceil(ac.sampleRate * duration)
      const buf = ac.createBuffer(1, n, ac.sampleRate)
      const data = buf.getChannelData(0)
      const decay = ac.sampleRate * 0.1
      for (let i = 0; i < n; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / decay)
      }
      const src = ac.createBufferSource()
      src.buffer = buf
      const filt = ac.createBiquadFilter()
      filt.type = 'lowpass'
      filt.frequency.value = cutoff
      const g = ac.createGain()
      g.gain.value = gain
      src.connect(filt)
      filt.connect(g)
      g.connect(ac.destination)
      src.start()
    } catch { /* AudioContext blocked or unavailable */ }
  }
  if (delayMs > 0) setTimeout(fire, delayMs)
  else fire()
}

export function playMove()    { playNoise(0.08, 1600, 0.55) }
export function playCapture() { playNoise(0.11, 2200, 0.75) }
export function playCheck()   { playNoise(0.07, 2800, 0.7); playNoise(0.07, 2800, 0.5, 90) }
export function playGameOver() {
  playNoise(0.12, 1200, 0.8)
  playNoise(0.12, 900,  0.7, 220)
  playNoise(0.20, 600,  0.6, 480)
}
