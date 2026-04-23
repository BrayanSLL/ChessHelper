import { useCallback, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { classifyMove, normalizeScore } from '../utils/moveClassification'
import type { AnalyzedMove } from '../types/chess'
import type { useStockfish } from './useStockfish'

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

type StockfishHook = ReturnType<typeof useStockfish>

export function useChessGame(
  analyze: StockfishHook['analyze'],
  getBestMove: StockfishHook['getBestMove'],
  elo: number,
) {
  const chessRef = useRef(new Chess())
  const [fen, setFen] = useState(STARTING_FEN)
  const [boardKey, setBoardKey] = useState(0)
  const [analyzedMoves, setAnalyzedMoves] = useState<AnalyzedMove[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [boardFlipped, setBoardFlipped] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const processingRef = useRef(false)
  const generationRef = useRef(0)

  const updateFen = useCallback(() => {
    setFen(chessRef.current.fen())
    setGameOver(chessRef.current.isGameOver())
  }, [])

  const makeMove = useCallback(
    async (from: string, to: string, promotion = 'q'): Promise<boolean> => {
      const chess = chessRef.current
      if (chess.isGameOver() || processingRef.current) return false

      const fenBefore = chess.fen()
      const turn = chess.turn()
      const moveNumber = chess.moveNumber()
      const generation = generationRef.current

      let move
      try {
        move = chess.move({ from, to, promotion })
      } catch {
        return false
      }
      if (!move) return false

      processingRef.current = true
      setIsAnalyzing(true)
      updateFen()

      const isStale = () => generationRef.current !== generation

      try {
        // Analyze position BEFORE player's move → get eval + engine's best move for classification
        const beforeResult = await analyze(fenBefore, 18)
        if (isStale()) return true

        // Analyze position AFTER player's move → get eval for the advantage bar
        const afterResult = await analyze(chess.fen(), 18)
        if (isStale()) return true

        const cpBefore = normalizeScore(beforeResult.score, turn)
        const cpAfter = normalizeScore(afterResult.score, chess.turn())

        const { quality, cpLoss } = classifyMove(
          cpBefore,
          cpAfter,
          turn,
          beforeResult.bestMove,
          move.lan,
        )

        setAnalyzedMoves((prev) => [
          ...prev,
          {
            san: move.san,
            lan: move.lan,
            from: move.from,
            to: move.to,
            quality,
            cpLoss,
            evalBefore: cpBefore,
            evalAfter: cpAfter,
            bestMove: beforeResult.bestMove,
            moveNumber,
            color: turn,
          },
        ])

        // Engine plays a response
        if (!chess.isGameOver()) {
          const engineMove = await getBestMove(chess.fen(), elo)
          if (isStale()) return true

          if (engineMove && engineMove !== '(none)' && engineMove.length >= 4) {
            try {
              chess.move({
                from: engineMove.slice(0, 2),
                to: engineMove.slice(2, 4),
                promotion: engineMove[4] ?? 'q',
              })
              updateFen()

              // One analysis after engine move to keep the eval bar current
              const evalAfterEngine = await analyze(chess.fen(), 18)
              if (isStale()) return true
              // evalAfterEngine is used by useStockfish's setEvaluation side-effect
              void evalAfterEngine
            } catch {
              // illegal engine move — ignore
            }
          }
        }
      } catch {
        // Superseded or engine error
      } finally {
        if (!isStale()) {
          processingRef.current = false
          setIsAnalyzing(false)
        }
      }

      return true
    },
    [analyze, getBestMove, elo, updateFen],
  )

  const resetGame = useCallback(() => {
    generationRef.current++
    processingRef.current = false
    chessRef.current = new Chess()
    setBoardKey((k) => k + 1)
    setFen(STARTING_FEN)
    setAnalyzedMoves([])
    setIsAnalyzing(false)
    setGameOver(false)
  }, [])

  const undoMove = useCallback(() => {
    if (processingRef.current) return
    const chess = chessRef.current
    chess.undo()
    chess.undo()
    setAnalyzedMoves((prev) => prev.slice(0, -2))
    updateFen()
  }, [updateFen])

  const flipBoard = useCallback(() => {
    setBoardFlipped((f) => !f)
  }, [])

  return {
    fen,
    boardKey,
    analyzedMoves,
    isAnalyzing,
    boardFlipped,
    gameOver,
    makeMove,
    resetGame,
    undoMove,
    flipBoard,
  }
}
