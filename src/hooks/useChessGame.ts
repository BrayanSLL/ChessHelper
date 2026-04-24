import { useCallback, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { classifyMove, normalizeScore } from '../utils/moveClassification'
import { playMove, playCapture, playCheck, playGameOver } from '../utils/sounds'
import type { AnalyzedMove, GameResult, GameSnapshot, PieceSymbol } from '../types/chess'
import type { useStockfish } from './useStockfish'

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const PIECE_ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p']
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}
const INITIAL_COUNTS: Record<PieceSymbol, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
}

type StockfishHook = ReturnType<typeof useStockfish>

function buildGameSnapshot(chess: Chess): GameSnapshot {
  const counts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  }

  for (const row of chess.board()) {
    for (const square of row) {
      if (!square) continue
      counts[square.color][square.type] += 1
    }
  }

  const makeSideState = (color: 'w' | 'b') => {
    const capturedByOpponent = PIECE_ORDER.flatMap((type) => {
      const missingCount = INITIAL_COUNTS[type] - counts[color][type]
      if (missingCount <= 0) return []
      return [{
        type,
        count: missingCount,
        value: PIECE_VALUES[type] * missingCount,
      }]
    })

    const materialOnBoard = PIECE_ORDER.reduce(
      (total, type) => total + counts[color][type] * PIECE_VALUES[type],
      0,
    )

    return {
      color,
      capturedByOpponent,
      lostMaterial: capturedByOpponent.reduce((total, piece) => total + piece.value, 0),
      materialOnBoard,
    }
  }

  const white = makeSideState('w')
  const black = makeSideState('b')
  const nonPawnMaterial = white.materialOnBoard + black.materialOnBoard - (counts.w.p + counts.b.p) * PIECE_VALUES.p
  const queensOnBoard = counts.w.q + counts.b.q

  let phase: GameSnapshot['phase'] = 'middlegame'
  if (chess.history().length < 12) {
    phase = 'opening'
  } else if (queensOnBoard <= 1 || nonPawnMaterial <= 26) {
    phase = 'endgame'
  }

  return {
    turn: chess.turn(),
    fullmoveNumber: chess.moveNumber(),
    phase,
    white,
    black,
    materialBalance: white.lostMaterial - black.lostMaterial,
  }
}

function buildGameResult(chess: Chess): GameResult {
  if (chess.isCheckmate()) {
    return {
      outcome: chess.turn() === 'w' ? 'black' : 'white',
      reason: 'checkmate',
      label: chess.turn() === 'w' ? 'Victoire des Noirs par mat' : 'Victoire des Blancs par mat',
    }
  }

  if (chess.isStalemate()) {
    return { outcome: 'draw', reason: 'stalemate', label: 'Nulle par pat' }
  }

  if (chess.isThreefoldRepetition()) {
    return { outcome: 'draw', reason: 'threefold', label: 'Nulle par repetition' }
  }

  if (chess.isDrawByFiftyMoves()) {
    return { outcome: 'draw', reason: 'fifty-move', label: 'Nulle par regle des 50 coups' }
  }

  if (chess.isInsufficientMaterial()) {
    return { outcome: 'draw', reason: 'insufficient-material', label: 'Nulle pour materiel insuffisant' }
  }

  return { outcome: 'ongoing', reason: 'ongoing', label: 'Partie en cours' }
}

export function useChessGame(
  analyze: StockfishHook['analyze'],
  getBestMove: StockfishHook['getBestMove'],
  elo: number,
) {
  const chessRef = useRef(new Chess())
  const [fen, setFen] = useState(STARTING_FEN)
  const [boardKey, setBoardKey] = useState(0)
  const [analyzedMoves, setAnalyzedMoves] = useState<AnalyzedMove[]>([])
  const [gameSnapshot, setGameSnapshot] = useState<GameSnapshot>(() => buildGameSnapshot(chessRef.current))
  const [gameResult, setGameResult] = useState<GameResult>(() => buildGameResult(chessRef.current))
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [boardFlipped, setBoardFlipped] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [lastMoveSq, setLastMoveSq] = useState<{ from: string; to: string } | null>(null)
  const [reviewIndex, setReviewIndex] = useState<number | null>(null)
  const processingRef = useRef(false)
  const generationRef = useRef(0)

  const syncGameState = useCallback(() => {
    setFen(chessRef.current.fen())
    setGameOver(chessRef.current.isGameOver())
    setGameSnapshot(buildGameSnapshot(chessRef.current))
    setGameResult(buildGameResult(chessRef.current))
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

      setLastMoveSq({ from: move.from, to: move.to })
      if (chess.isGameOver()) playGameOver()
      else if (chess.inCheck()) playCheck()
      else if (move.captured) playCapture()
      else playMove()

      processingRef.current = true
      setIsAnalyzing(true)
      syncGameState()

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
            fenBefore,
            moveNumber,
            color: turn,
          },
        ])

        if (!chess.isGameOver()) {
          const engineTurn = chess.turn()
          const engineFenBefore = chess.fen()
          const engineMove = await getBestMove(engineFenBefore, elo)
          if (isStale()) return true

          if (engineMove && engineMove !== '(none)' && engineMove.length >= 4) {
            try {
              const appliedEngineMove = chess.move({
                from: engineMove.slice(0, 2),
                to: engineMove.slice(2, 4),
                ...(engineMove[4] ? { promotion: engineMove[4] } : {}),
              })
              setLastMoveSq({ from: appliedEngineMove.from, to: appliedEngineMove.to })
              if (chess.isGameOver()) playGameOver()
              else if (chess.inCheck()) playCheck()
              else if (appliedEngineMove.captured) playCapture()
              else playMove()
              syncGameState()
              const evalAfterEngine = await analyze(chess.fen(), 14)
              if (isStale()) return true
              const cpAfterEngine = normalizeScore(evalAfterEngine.score, chess.turn())
              const { quality, cpLoss } = classifyMove(
                cpAfter,
                cpAfterEngine,
                engineTurn,
                afterResult.bestMove,
                appliedEngineMove.lan,
              )

              setAnalyzedMoves((prev) => [
                ...prev,
                {
                  san: appliedEngineMove.san,
                  lan: appliedEngineMove.lan,
                  from: appliedEngineMove.from,
                  to: appliedEngineMove.to,
                  quality,
                  cpLoss,
                  evalBefore: cpAfter,
                  evalAfter: cpAfterEngine,
                  bestMove: afterResult.bestMove,
                  fenBefore: engineFenBefore,
                  moveNumber: appliedEngineMove.color === 'w' ? chess.moveNumber() - 1 : chess.moveNumber(),
                  color: appliedEngineMove.color,
                },
              ])
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
    [analyze, getBestMove, elo, syncGameState],
  )

  const resetGame = useCallback(async (color: 'white' | 'black' | 'random' = 'random') => {
    const gen = ++generationRef.current
    processingRef.current = false
    chessRef.current = new Chess()

    const playAsBlack =
      color === 'black' ? true : color === 'white' ? false : Math.random() < 0.5

    setBoardKey((k) => k + 1)
    setFen(STARTING_FEN)
    setAnalyzedMoves([])
    setIsAnalyzing(false)
    setGameOver(false)
    setLastMoveSq(null)
    setReviewIndex(null)
    setBoardFlipped(playAsBlack)
    setGameSnapshot(buildGameSnapshot(chessRef.current))
    setGameResult(buildGameResult(chessRef.current))

    if (playAsBlack) {
      processingRef.current = true
      setIsAnalyzing(true)
      try {
        const beforeResult = await analyze(STARTING_FEN, 14)
        if (generationRef.current !== gen) return
        const engineMove = await getBestMove(STARTING_FEN, elo)
        if (generationRef.current !== gen) return
        if (engineMove && engineMove !== '(none)' && engineMove.length >= 4) {
          const chess = chessRef.current
          try {
            const appliedEngineMove = chess.move({
              from: engineMove.slice(0, 2),
              to: engineMove.slice(2, 4),
              ...(engineMove[4] ? { promotion: engineMove[4] } : {}),
            })
            syncGameState()
            const afterResult = await analyze(chess.fen(), 14)
            if (generationRef.current !== gen) return
            const cpBefore = normalizeScore(beforeResult.score, 'w')
            const cpAfter = normalizeScore(afterResult.score, chess.turn())
            const { quality, cpLoss } = classifyMove(
              cpBefore,
              cpAfter,
              appliedEngineMove.color,
              beforeResult.bestMove,
              appliedEngineMove.lan,
            )
            setAnalyzedMoves([
              {
                san: appliedEngineMove.san,
                lan: appliedEngineMove.lan,
                from: appliedEngineMove.from,
                to: appliedEngineMove.to,
                quality,
                cpLoss,
                evalBefore: cpBefore,
                evalAfter: cpAfter,
                bestMove: beforeResult.bestMove,
                fenBefore: STARTING_FEN,
                moveNumber: 1,
                color: appliedEngineMove.color,
              },
            ])
          } catch { /* ignore */ }
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
    setAnalyzedMoves((prev) => prev.slice(0, Math.max(0, prev.length - 2)))
    const history = chess.history({ verbose: true })
    const prev = history[history.length - 1]
    setLastMoveSq(prev ? { from: prev.from, to: prev.to } : null)
    syncGameState()
  }, [syncGameState])

  const getPgn = useCallback(() => chessRef.current.pgn(), [])

  const goToMove = useCallback((index: number | null) => setReviewIndex(index), [])

  const flipBoard = useCallback(() => {
    setBoardFlipped((f) => !f)
  }, [])

  return {
    fen,
    boardKey,
    analyzedMoves,
    gameSnapshot,
    gameResult,
    isAnalyzing,
    boardFlipped,
    gameOver,
    lastMoveSq,
    reviewIndex,
    isValidMove,
    makeMove,
    resetGame,
    undoMove,
    flipBoard,
    getPgn,
    goToMove,
  }
}
