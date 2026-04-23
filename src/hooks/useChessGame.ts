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

  const syncFen = useCallback(() => {
    setFen(chessRef.current.fen())
    setGameOver(chessRef.current.isGameOver())
  }, [])

  // Pre-validate a move without mutating state (used by the board before accepting a drop)
  const isValidMove = useCallback((from: string, to: string): boolean => {
    try {
      const copy = new Chess(chessRef.current.fen())
      return copy.move({ from, to }) !== null
    } catch {
      return false
    }
  }, [])

  const makeMove = useCallback(
    async (from: string, to: string, promotion?: string): Promise<boolean> => {
      const chess = chessRef.current
      if (chess.isGameOver() || processingRef.current) return false

      const fenBefore = chess.fen()
      const turn = chess.turn()
      const moveNumber = chess.moveNumber()
      const generation = generationRef.current

      let move
      try {
        // Only include promotion when it's actually a pawn promotion —
        // passing promotion:'q' on a castling move causes chess.js to reject it
        move = chess.move(promotion ? { from, to, promotion } : { from, to })
      } catch {
        return false
      }
      if (!move) return false

      processingRef.current = true
      setIsAnalyzing(true)
      syncFen()

      const isStale = () => generationRef.current !== generation

      try {
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

        if (!chess.isGameOver()) {
          const engineMove = await getBestMove(chess.fen(), elo)
          if (isStale()) return true

          if (engineMove && engineMove !== '(none)' && engineMove.length >= 4) {
            try {
              chess.move({
                from: engineMove.slice(0, 2),
                to: engineMove.slice(2, 4),
                ...(engineMove[4] ? { promotion: engineMove[4] } : {}),
              })
              syncFen()
              const evalAfterEngine = await analyze(chess.fen(), 14)
              if (isStale()) return true
              void evalAfterEngine
            } catch {
              // illegal engine move
            }
          }
        }
      } catch {
        // superseded or engine error
      } finally {
        if (!isStale()) {
          processingRef.current = false
          setIsAnalyzing(false)
        }
      }

      return true
    },
    [analyze, getBestMove, elo, syncFen],
  )

  const resetGame = useCallback(async () => {
    const gen = ++generationRef.current
    processingRef.current = false
    chessRef.current = new Chess()

    const playAsBlack = Math.random() < 0.5

    setBoardKey((k) => k + 1)
    setFen(STARTING_FEN)
    setAnalyzedMoves([])
    setIsAnalyzing(false)
    setGameOver(false)
    setBoardFlipped(playAsBlack)

    if (playAsBlack) {
      processingRef.current = true
      setIsAnalyzing(true)
      try {
        const engineMove = await getBestMove(STARTING_FEN, elo)
        if (generationRef.current !== gen) return
        if (engineMove && engineMove !== '(none)' && engineMove.length >= 4) {
          const chess = chessRef.current
          try {
            chess.move({
              from: engineMove.slice(0, 2),
              to: engineMove.slice(2, 4),
              ...(engineMove[4] ? { promotion: engineMove[4] } : {}),
            })
          } catch { /* ignore */ }
          setFen(chess.fen())
          setGameOver(chess.isGameOver())
          await analyze(chess.fen(), 14)
        }
      } catch { /* ignore */ }
      finally {
        if (generationRef.current === gen) {
          processingRef.current = false
          setIsAnalyzing(false)
        }
      }
    }
  }, [getBestMove, elo, analyze])

  const undoMove = useCallback(() => {
    if (processingRef.current) return
    const chess = chessRef.current
    chess.undo()
    chess.undo()
    setAnalyzedMoves((prev) => prev.slice(0, -2))
    syncFen()
  }, [syncFen])

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
    isValidMove,
    makeMove,
    resetGame,
    undoMove,
    flipBoard,
  }
}
