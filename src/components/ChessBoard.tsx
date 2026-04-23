import { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'

interface Props {
  fen: string
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>
  bestMoveArrow: [string, string] | null
  isFlipped: boolean
  isAnalyzing: boolean
  gameOver: boolean
}

export function ChessBoard({
  fen,
  onMove,
  bestMoveArrow,
  isFlipped,
  isAnalyzing,
  gameOver,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(480)

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

  const arrows: Arrow[] = bestMoveArrow
    ? [[bestMoveArrow[0] as Square, bestMoveArrow[1] as Square, 'rgb(0, 168, 0)']]
    : []

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
        onPieceDrop={(source, target, piece) => {
          if (isAnalyzing || gameOver) return false
          const promotion =
            piece[1] === 'P' &&
            ((piece[0] === 'w' && target[1] === '8') ||
              (piece[0] === 'b' && target[1] === '1'))
              ? 'q'
              : undefined
          onMove(source, target, promotion)
          return true
        }}
        boardOrientation={isFlipped ? 'black' : 'white'}
        customArrows={arrows}
        arePiecesDraggable={!isAnalyzing && !gameOver}
        animationDuration={150}
        customDarkSquareStyle={{ backgroundColor: '#769656' }}
        customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
      />
    </div>
  )
}
