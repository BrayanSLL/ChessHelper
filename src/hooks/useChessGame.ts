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
  const [bestMoveArrow, setBestMoveArrow] = useState<[string, string] | null>(null)
  const [boardFlipped, setBoardFlipped] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const processingRef = useRef(false)
  // Incremented on every reset — async operations check this to self-cancel
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
      setBestMoveArrow(null)

      // Helper: returns true if a reset happened since this move started
      const isStale = () => generationRef.current !== generation

      try {
        // Sequential analysis — concurrent calls would cancel each other
        const beforeResult = await analyze(fenBefore, 18)
        if (isStale()) return true

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

        if (afterResult.bestMove?.length >= 4) {
          setBestMoveArrow([
            afterResult.bestMove.slice(0, 2),
            afterResult.bestMove.slice(2, 4),
          ])
        }

        // Engine response
        if (!chess.isGameOver()) {
          const engineMove = await getBestMove(chess.fen(), elo)
          if (isStale()) return true

          if (engineMove && engineMove !== '(none)' && engineMove.length >= 4) {
            const fenBeforeEngine = chess.fen()
            const engineTurn = chess.turn()
            const engineMoveNumber = chess.moveNumber()

            let engineMoveObj
            try {
              engineMoveObj = chess.move({
                from: engineMove.slice(0, 2),
                to: engineMove.slice(2, 4),
                promotion: engineMove[4] ?? 'q',
              })
            } catch {
              engineMoveObj = null
            }

            if (engineMoveObj) {
              updateFen()

              const engBefore = await analyze(fenBeforeEngine, 18)
              if (isStale()) return true

              const engAfter = await analyze(chess.fen(), 18)
              if (isStale()) return true

              const engCpBefore = normalizeScore(engBefore.score, engineTurn)
              const engCpAfter = normalizeScore(engAfter.score, chess.turn())
              const { quality: engQuality, cpLoss: engCpLoss } = classifyMove(
                engCpBefore,
                engCpAfter,
                engineTurn,
                engBefore.bestMove,
                engineMoveObj.lan,
              )

              setAnalyzedMoves((prev) => [
                ...prev,
                {
                  san: engineMoveObj!.san,
                  lan: engineMoveObj!.lan,
                  from: engineMoveObj!.from,
                  to: engineMoveObj!.to,
                  quality: engQuality,
                  cpLoss: engCpLoss,
                  evalBefore: engCpBefore,
                  evalAfter: engCpAfter,
                  bestMove: engBefore.bestMove,
                  moveNumber: engineMoveNumber,
                  color: engineTurn,
                },
              ])

              if (engAfter.bestMove?.length >= 4) {
                setBestMoveArrow([
                  engAfter.bestMove.slice(0, 2),
                  engAfter.bestMove.slice(2, 4),
                ])
              }
            }
          }
        }
      } catch {
        // Superseded analysis or engine error — game continues
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
    generationRef.current++          // invalidate all in-flight async ops
    processingRef.current = false
    chessRef.current = new Chess()
    setBoardKey((k) => k + 1)        // force remount of react-chessboard
    setFen(STARTING_FEN)
    setAnalyzedMoves([])
    setBestMoveArrow(null)
    setIsAnalyzing(false)
    setGameOver(false)
  }, [])

  const undoMove = useCallback(() => {
    if (processingRef.current) return
    const chess = chessRef.current
    chess.undo()
    chess.undo()
    setAnalyzedMoves((prev) => prev.slice(0, -2))
    setBestMoveArrow(null)
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
    bestMoveArrow,
    boardFlipped,
    gameOver,
    makeMove,
    resetGame,
    undoMove,
    flipBoard,
  }
}
