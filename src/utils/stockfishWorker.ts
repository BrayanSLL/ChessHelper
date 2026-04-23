import type { EvaluationResult } from '../types/chess'

type OutputHandler = (line: string) => void

export class StockfishEngine {
  private worker: Worker
  private outputHandlers: OutputHandler[] = []
  private isReady = false
  private queue: string[] = []
  private readyCallbacks: (() => void)[] = []

  constructor() {
    this.worker = new Worker('/stockfish.js')
    this.worker.onmessage = (e: MessageEvent) => {
      const line: string =
        typeof e.data === 'string' ? e.data : String(e.data ?? '')
      if (!line) return
      if (line === 'uciok') {
        this.worker.postMessage('isready')
      } else if (line === 'readyok') {
        this.isReady = true
        this.readyCallbacks.forEach((cb) => cb())
        this.readyCallbacks = []
        this.queue.forEach((cmd) => this.worker.postMessage(cmd))
        this.queue = []
      } else {
        this.outputHandlers.forEach((h) => h(line))
      }
    }
    this.worker.onerror = (e) => console.error('[Stockfish]', e.message)
    this.worker.postMessage('uci')
  }

  send(cmd: string): void {
    if (this.isReady) {
      this.worker.postMessage(cmd)
    } else {
      this.queue.push(cmd)
    }
  }

  onOutput(handler: OutputHandler): () => void {
    this.outputHandlers.push(handler)
    return () => {
      this.outputHandlers = this.outputHandlers.filter((h) => h !== handler)
    }
  }

  whenReady(): Promise<void> {
    if (this.isReady) return Promise.resolve()
    return new Promise((resolve) => this.readyCallbacks.push(resolve))
  }

  terminate(): void {
    this.worker.terminate()
  }
}

export function parseInfoLine(line: string): Partial<EvaluationResult> | null {
  if (!line.startsWith('info') || !line.includes('score')) return null

  const result: Partial<EvaluationResult> = {}

  const depthMatch = line.match(/\bdepth (\d+)/)
  if (depthMatch) result.depth = parseInt(depthMatch[1])

  const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/)
  if (scoreMatch) {
    if (scoreMatch[1] === 'cp') {
      result.score = parseInt(scoreMatch[2])
      result.isMate = false
      result.mateIn = null
    } else {
      const mateIn = parseInt(scoreMatch[2])
      result.score = mateIn > 0 ? 10000 : -10000
      result.isMate = true
      result.mateIn = mateIn
    }
  }

  const pvMatch = line.match(/\bpv (\w+)/)
  if (pvMatch) result.bestMove = pvMatch[1]

  return result
}

export function applyEloSettings(engine: StockfishEngine, elo: number): void {
  if (elo >= 1320) {
    engine.send('setoption name UCI_LimitStrength value true')
    engine.send(`setoption name UCI_Elo value ${Math.min(elo, 3190)}`)
  } else {
    const skillLevel = Math.round(((elo - 800) / (1320 - 800)) * 8)
    engine.send('setoption name UCI_LimitStrength value false')
    engine.send(`setoption name Skill Level value ${Math.max(0, skillLevel)}`)
  }
}
