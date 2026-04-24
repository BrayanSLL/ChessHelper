import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'

interface Props {
  fen: string
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>
  isValidMove: (from: string, to: string) => boolean
  isFlipped: boolean
  isAnalyzing: boolean
  gameOver: boolean
  lastMove?: { from: string; to: string } | null
  bestMoveArrow?: { from: string; to: string } | null
  readOnly?: boolean
}

function normalizeDropTarget(source: string, target: string, piece: string) {
  if (piece !== 'wK' && piece !== 'bK') return target

  const castlingMap: Record<string, string> = {
    'e1-h1': 'g1',
    'e1-a1': 'c1',
    'e8-h8': 'g8',
    'e8-a8': 'c8',
  }

  return castlingMap[`${source}-${target}`] ?? target
}

export function ChessBoard({ fen, onMove, isValidMove, isFlipped, isAnalyzing, gameOver, lastMove, bestMoveArrow, readOnly }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(480)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [moveTargets, setMoveTargets] = useState<string[]>([])

  const chess = useMemo(() => new Chess(fen), [fen])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      if (w > 0) setBoardWidth(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setSelectedSquare(null)
    setMoveTargets([])
  }, [fen, isAnalyzing, gameOver])

  function getMoveTargets(square: string) {
    try {
      return chess.moves({ square: square as Square, verbose: true }).map((move) => move.to)
    } catch {
      return []
    }
  }

  function selectSquare(square: string, piece?: string) {
    if (isAnalyzing || gameOver || readOnly) return
    const currentTurn = chess.turn()
    if (!piece || piece[0] !== currentTurn) {
      setSelectedSquare(null)
      setMoveTargets([])
      return
    }

    const targets = getMoveTargets(square)
    if (targets.length === 0) {
      setSelectedSquare(null)
      setMoveTargets([])
      return
    }

    setSelectedSquare(square)
    setMoveTargets(targets)
  }

  function tryMove(source: string, target: string, piece: string) {
    const normalizedTarget = normalizeDropTarget(source, target, piece)
    if (!isValidMove(source, normalizedTarget)) return false

    const promotion =
      piece[1] === 'P' &&
      ((piece[0] === 'w' && normalizedTarget[1] === '8') ||
        (piece[0] === 'b' && normalizedTarget[1] === '1'))
        ? 'q'
        : undefined

    setSelectedSquare(null)
    setMoveTargets([])
    void onMove(source, normalizedTarget, promotion)
    return true
  }

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {}

    // Last move highlight (yellow, behind selection)
    if (lastMove) {
      const lastMoveStyle: CSSProperties = { backgroundColor: 'rgba(255, 213, 0, 0.38)' }
      styles[lastMove.from] = lastMoveStyle
      styles[lastMove.to] = lastMoveStyle
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow: 'inset 0 0 0 4px rgba(163, 230, 53, 0.92)',
        backgroundColor: 'rgba(163, 230, 53, 0.24)',
      }
    }

    for (const square of moveTargets) {
      const pieceOnTarget = chess.get(square as never)
      styles[square] = pieceOnTarget
        ? {
            boxShadow: 'inset 0 0 0 4px rgba(249, 115, 22, 0.88)',
            backgroundColor: 'rgba(249, 115, 22, 0.18)',
          }
        : {
            backgroundImage: 'radial-gradient(circle, rgba(163,230,53,0.82) 0, rgba(163,230,53,0.82) 18%, transparent 20%)',
          }
    }

    return styles
  }, [chess, lastMove, moveTargets, selectedSquare])

  return (
    <div ref={containerRef} className="relative w-full" style={{ maxWidth: 600 }}>
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 rounded pointer-events-none">
          <div className="bg-gray-900/80 rounded-lg px-4 py-2 text-sm text-gray-300">
            Analyse…
          </div>
        </div>
      )}
      <Chessboard
        boardWidth={boardWidth}
        position={fen}
        customSquareStyles={customSquareStyles}
        onPieceDrop={(source, target, piece) => {
          if (isAnalyzing || gameOver) return false
          return tryMove(source, target, piece)
        }}
        onPieceClick={(piece, square) => {
          if (selectedSquare === square) {
            setSelectedSquare(null)
            setMoveTargets([])
            return
          }
          selectSquare(square, piece)
        }}
        onSquareClick={(square, piece) => {
          if (isAnalyzing || gameOver) return

          if (selectedSquare) {
            const selectedPiece = chess.get(selectedSquare as never)
            const currentPieceCode = selectedPiece ? `${selectedPiece.color}${selectedPiece.type.toUpperCase()}` : ''

            if (moveTargets.includes(square) && currentPieceCode) {
              if (tryMove(selectedSquare, square, currentPieceCode)) return
            }
          }

          selectSquare(square, piece)
        }}
        boardOrientation={isFlipped ? 'black' : 'white'}
        arePiecesDraggable={!isAnalyzing && !gameOver && !readOnly}
        animationDuration={150}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
        customArrows={[
          ...(lastMove ? [[lastMove.from as Square, lastMove.to as Square, 'rgba(6,100,6,0.72)']] as [Square, Square, string][] : []),
          ...(bestMoveArrow ? [[bestMoveArrow.from as Square, bestMoveArrow.to as Square, 'rgba(59,130,246,0.88)']] as [Square, Square, string][] : []),
        ]}
        customArrowColor="rgba(6,100,6,0.72)"
      />
    </div>
  )
}
