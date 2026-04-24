import { useEffect, useRef, useState, useCallback } from 'react'
import { Chess } from 'chess.js'
import { StockfishEngine, parseInfoLine, applyEloSettings, getEngineMoveTime } from '../utils/stockfishWorker'
import type { EvaluationResult } from '../types/chess'

const ANALYSIS_DEPTH = 18

type CandidateMove = {
  lan: string
  score: number
}

const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
} as const

function evaluateHumanLikeMove(fen: string, lan: string): number {
  const chess = new Chess(fen)
  const move = chess.move({
    from: lan.slice(0, 2),
    to: lan.slice(2, 4),
    ...(lan[4] ? { promotion: lan[4] } : {}),
  })

  if (!move) return Number.NEGATIVE_INFINITY

  let score = Math.random() * 3

  if (move.captured) score += PIECE_VALUES[move.captured] * 4
  if (move.promotion) score += 8
  if (move.san.includes('+')) score += 2.5
  if (move.san === 'O-O' || move.san === 'O-O-O') score += 1.75
  if (['d4', 'e4', 'd5', 'e5'].includes(move.to)) score += 1.1
  if (['c3', 'd3', 'e3', 'f3', 'c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5', 'c6', 'd6', 'e6', 'f6'].includes(move.to)) score += 0.35

  if (move.piece === 'q' && chess.history().length < 14) score -= 2.5
  if (move.piece === 'k' && !move.san.startsWith('O-O')) score -= 5

  return score
}

function chooseFallbackMove(fen: string, elo: number): string {
  const chess = new Chess(fen)
  const legalMoves = chess.moves({ verbose: true })
  if (legalMoves.length === 0) return ''

  const randomLan = legalMoves[Math.floor(Math.random() * legalMoves.length)].lan
  if (elo <= 140) return randomLan

  const rankedMoves = legalMoves
    .map((move) => ({ lan: move.lan, score: evaluateHumanLikeMove(fen, move.lan) }))
    .sort((a, b) => b.score - a.score)

  const poolSize = elo <= 300 ? Math.min(8, rankedMoves.length) : elo <= 600 ? Math.min(6, rankedMoves.length) : Math.min(4, rankedMoves.length)
  const pool = rankedMoves.slice(0, poolSize)
  const weights = pool.map((move, index) => {
    const randomness = elo <= 300 ? 2.4 : elo <= 600 ? 1.6 : 1
    return Math.max(0.1, move.score + randomness * (poolSize - index))
  })

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let draw = Math.random() * totalWeight
  for (let i = 0; i < pool.length; i += 1) {
    draw -= weights[i]
    if (draw <= 0) return pool[i].lan
  }

  return pool[0].lan
}

function parseMultiPvLine(line: string): CandidateMove | null {
  if (!line.startsWith('info') || !line.includes(' pv ') || !line.includes(' score ')) return null

  const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/)
  const pvMatch = line.match(/\bpv (\w+)/)
  if (!scoreMatch || !pvMatch) return null

  const score =
    scoreMatch[1] === 'mate'
      ? (parseInt(scoreMatch[2], 10) > 0 ? 100000 : -100000)
      : parseInt(scoreMatch[2], 10)

  return {
    lan: pvMatch[1],
    score,
  }
}

function chooseWeakEngineMove(candidates: CandidateMove[], elo: number): string {
  if (candidates.length === 0) return ''

  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const poolSize = elo <= 250 ? Math.min(5, sorted.length) : elo <= 500 ? Math.min(4, sorted.length) : Math.min(3, sorted.length)
  const pool = sorted.slice(0, poolSize)
  const jitter = elo <= 250 ? 120 : elo <= 500 ? 80 : 45
  const weights = pool.map((candidate, index) => {
    const noisyScore = candidate.score + (Math.random() - 0.5) * jitter
    return Math.max(1, noisyScore - pool[pool.length - 1].score + (poolSize - index) * 12)
  })

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let draw = Math.random() * totalWeight
  for (let i = 0; i < pool.length; i += 1) {
    draw -= weights[i]
    if (draw <= 0) return pool[i].lan
  }

  return pool[0].lan
}

export function useStockfish() {
  const engineRef = useRef<StockfishEngine | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const analysisIdRef = useRef(0)

  useEffect(() => {
    const engine = new StockfishEngine()
    engineRef.current = engine
    engine.whenReady().then(() => setIsReady(true))
    return () => engine.terminate()
  }, [])

  const analyze = useCallback(
    (fen: string, depth = ANALYSIS_DEPTH): Promise<EvaluationResult> => {
      return new Promise((resolve, reject) => {
        const engine = engineRef.current
        if (!engine) { reject(new Error('Engine not ready')); return }

        const id = ++analysisIdRef.current
        let best: Partial<EvaluationResult> = {}

        engine.send('stop')

        const unsubscribe = engine.onOutput((line) => {
          if (analysisIdRef.current !== id) {
            unsubscribe()
            reject(new Error('Superseded'))
            return
          }

          if (line.startsWith('bestmove')) {
            unsubscribe()
            const parts = line.split(' ')
            const result: EvaluationResult = {
              score: best.score ?? 0,
              depth: best.depth ?? 0,
              bestMove: parts[1] ?? '',
              isMate: best.isMate ?? false,
              mateIn: best.mateIn ?? null,
            }
            setEvaluation(result)
            resolve(result)
            return
          }

          const parsed = parseInfoLine(line)
          if (parsed && parsed.depth !== undefined) {
            best = { ...best, ...parsed }
          }
        })

        engine.send(`position fen ${fen}`)
        engine.send(`go depth ${depth}`)
      })
    },
    [],
  )

  const getBestMove = useCallback(
    (fen: string, elo: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const engine = engineRef.current
        if (!engine) { reject(new Error('Engine not ready')); return }

        if (elo <= 900) {
          const fallbackMove = chooseFallbackMove(fen, elo)
          const useFallback =
            elo <= 180 ||
            Math.random() < (elo <= 300 ? 0.82 : elo <= 500 ? 0.58 : elo <= 700 ? 0.34 : 0.16)

          if (useFallback) {
            resolve(fallbackMove)
            return
          }
        }

        const id = ++analysisIdRef.current
        const candidateMap = new Map<string, CandidateMove>()

        engine.send('stop')
        applyEloSettings(engine, elo)
        if (elo <= 900) {
          engine.send('setoption name MultiPV value 5')
        } else {
          engine.send('setoption name MultiPV value 1')
        }

        const unsubscribe = engine.onOutput((line) => {
          if (analysisIdRef.current !== id) {
            unsubscribe()
            reject(new Error('Superseded'))
            return
          }

           const candidate = parseMultiPvLine(line)
           if (candidate) {
             candidateMap.set(candidate.lan, candidate)
           }

          if (line.startsWith('bestmove')) {
            unsubscribe()
            const move = line.split(' ')[1] ?? ''
            if (elo <= 900 && candidateMap.size > 0) {
              resolve(chooseWeakEngineMove(Array.from(candidateMap.values()), elo))
              return
            }
            resolve(move)
          }
        })

        engine.send(`position fen ${fen}`)
        engine.send(`go movetime ${getEngineMoveTime(elo)}`)
      })
    },
    [],
  )

  const getAlternatives = useCallback(
    (fen: string, count = 3): Promise<{ move: string; score: number; isMate: boolean }[]> => {
      return new Promise((resolve, reject) => {
        const engine = engineRef.current
        if (!engine) { reject(new Error('Engine not ready')); return }

        const id = ++analysisIdRef.current
        const candidateMap = new Map<string, { move: string; score: number; isMate: boolean }>()

        engine.send('stop')
        engine.send(`setoption name MultiPV value ${count + 1}`)

        const unsubscribe = engine.onOutput((line) => {
          if (analysisIdRef.current !== id) {
            unsubscribe()
            reject(new Error('Superseded'))
            return
          }

          if (line.startsWith('info') && line.includes(' pv ') && line.includes(' score ')) {
            const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/)
            const pvMatch = line.match(/\bpv (\w+)/)
            if (scoreMatch && pvMatch) {
              const isMate = scoreMatch[1] === 'mate'
              const score = isMate
                ? (parseInt(scoreMatch[2], 10) > 0 ? 100000 : -100000)
                : parseInt(scoreMatch[2], 10)
              candidateMap.set(pvMatch[1], { move: pvMatch[1], score, isMate })
            }
          }

          if (line.startsWith('bestmove')) {
            unsubscribe()
            engine.send('setoption name MultiPV value 1')
            const results = Array.from(candidateMap.values())
              .sort((a, b) => b.score - a.score)
              .slice(0, count)
            resolve(results)
          }
        })

        engine.send(`position fen ${fen}`)
        engine.send('go depth 14')
      })
    },
    [],
  )

  return { isReady, evaluation, analyze, getBestMove, getAlternatives }
}
