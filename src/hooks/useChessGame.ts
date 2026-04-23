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
  const [analyzedMoves, setAnalyzedMoves] = useState<AnalyzedMove[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [bestMoveArrow, setBestMoveArrow] = useState<[string, string] | null>(null)
  const [boardFlipped, setBoardFlipped] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const processingRef = useRef(false)

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

      try {
        // Analyze position before the move to get engine's top move + cpBefore
        const [beforeResult, afterResult] = await Promise.all([
          analyze(fenBefore, 18),
          analyze(chess.fen(), 18),
        ])

        const cpBefore = normalizeScore(beforeResult.score, turn)
        const cpAfter = normalizeScore(afterResult.score, chess.turn())
        const engineTopMove = beforeResult.bestMove

        const { quality, cpLoss } = classifyMove(
          cpBefore,
          cpAfter,
          turn,
          engineTopMove,
          move.lan,
        )

        const analyzed: AnalyzedMove = {
          san: move.san,
          lan: move.lan,
          from: move.from,
          to: move.to,
          quality,
          cpLoss,
          evalBefore: cpBefore,
          evalAfter: cpAfter,
          bestMove: engineTopMove,
          moveNumber,
          color: turn,
        }

        setAnalyzedMoves((prev) => [...prev, analyzed])

        // Show best move arrow for current position
        setBestMoveArrow([
          afterResult.bestMove.slice(0, 2),
          afterResult.bestMove.slice(2, 4),
        ])

        // Engine plays a response if game is not over
        if (!chess.isGameOver()) {
          const engineMove = await getBestMove(chess.fen(), elo)
          if (engineMove && engineMove !== '(none)') {
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

              const [engBefore, engAfter] = await Promise.all([
                analyze(fenBeforeEngine, 18),
                analyze(chess.fen(), 18),
              ])

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

              setBestMoveArrow([
                engAfter.bestMove.slice(0, 2),
                engAfter.bestMove.slice(2, 4),
              ])
            }
          }
        }
      } catch {
        // Analysis was superseded or errored — keep playing
      } finally {
        processingRef.current = false
        setIsAnalyzing(false)
      }

      return true
    },
    [analyze, getBestMove, elo, updateFen],
  )

  const resetGame = useCallback(() => {
    chessRef.current = new Chess()
    setFen(STARTING_FEN)
    setAnalyzedMoves([])
    setBestMoveArrow(null)
    setIsAnalyzing(false)
    setGameOver(false)
    processingRef.current = false
  }, [])

  const undoMove = useCallback(() => {
    const chess = chessRef.current
    // Undo two moves (player + engine)
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
