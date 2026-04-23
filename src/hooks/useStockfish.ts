import { useEffect, useRef, useState, useCallback } from 'react'
import { StockfishEngine, parseInfoLine, applyEloSettings } from '../utils/stockfishWorker'
import type { EvaluationResult } from '../types/chess'

const ANALYSIS_DEPTH = 18

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

        const id = ++analysisIdRef.current

        engine.send('stop')
        applyEloSettings(engine, elo)

        const unsubscribe = engine.onOutput((line) => {
          if (analysisIdRef.current !== id) {
            unsubscribe()
            reject(new Error('Superseded'))
            return
          }
          if (line.startsWith('bestmove')) {
            unsubscribe()
            const move = line.split(' ')[1] ?? ''
            resolve(move)
          }
        })

        engine.send(`position fen ${fen}`)
        engine.send('go movetime 800')
      })
    },
    [],
  )

  return { isReady, evaluation, analyze, getBestMove }
}
