import { useEffect, useRef } from 'react'
import { MOVE_QUALITY_CONFIG } from '../types/chess'
import type { AnalyzedMove } from '../types/chess'

interface Props {
  moves: AnalyzedMove[]
  reviewIndex?: number | null
  onMoveClick?: (index: number) => void
}

export function MoveHistory({ moves, reviewIndex, onMoveClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Scroll to keep selected move visible; if no selection, scroll to bottom
  useEffect(() => {
    if (reviewIndex !== null && reviewIndex !== undefined) {
      selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    } else {
      const el = containerRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [moves.length, reviewIndex])

  const pairs: { white?: { move: AnalyzedMove; idx: number }; black?: { move: AnalyzedMove; idx: number }; num: number }[] = []
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    if (move.color === 'w') {
      pairs.push({ white: { move, idx: i }, num: move.moveNumber })
    } else {
      const last = pairs[pairs.length - 1]
      if (last && !last.black) {
        last.black = { move, idx: i }
      } else {
        pairs.push({ black: { move, idx: i }, num: move.moveNumber })
      }
    }
  }

  if (moves.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 bg-black/20 py-6 text-center text-sm text-gray-500">
        Aucun coup joué
      </div>
    )
  }

  return (
    <div ref={containerRef} className="overflow-y-auto max-h-[260px] rounded-[24px] border border-white/6 bg-black/20">
      <div className="sticky top-0 z-10 grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-white/6 bg-[#221f1b] px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-gray-500">
        <span>#</span>
        <span>Blancs</span>
        <span>Noirs</span>
      </div>
      {pairs.map((pair, i) => (
        <div
          key={i}
          className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-white/5 px-3 py-2 text-sm last:border-b-0 even:bg-white/[0.02]"
        >
          <span className="pt-2 text-right text-gray-500">{pair.num}.</span>
          {pair.white ? (
            <MoveChip
              move={pair.white.move}
              sideLabel="Blancs"
              isSelected={reviewIndex === pair.white.idx}
              ref={reviewIndex === pair.white.idx ? selectedRef : undefined}
              onClick={() => onMoveClick?.(pair.white!.idx)}
            />
          ) : (
            <span className="flex-1" />
          )}
          {pair.black ? (
            <MoveChip
              move={pair.black.move}
              sideLabel="Noirs"
              isSelected={reviewIndex === pair.black.idx}
              ref={reviewIndex === pair.black.idx ? selectedRef : undefined}
              onClick={() => onMoveClick?.(pair.black!.idx)}
            />
          ) : (
            <span className="flex-1" />
          )}
        </div>
      ))}
    </div>
  )
}

import { forwardRef } from 'react'

const MoveChip = forwardRef<
  HTMLDivElement,
  { move: AnalyzedMove; sideLabel: string; isSelected: boolean; onClick: () => void }
>(function MoveChip({ move, sideLabel, isSelected, onClick }, ref) {
  const cfg = MOVE_QUALITY_CONFIG[move.quality]
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`min-w-0 cursor-pointer rounded-2xl border px-3 py-2 transition-colors ${cfg.bgColor} ${
        isSelected
          ? 'border-white/40 ring-1 ring-white/30'
          : 'border-white/5 hover:border-white/20'
      }`}
      title={`${cfg.label} (perte: ${move.cpLoss} cp)`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.24em] text-gray-400">{sideLabel}</span>
        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
      </div>
      <div className="truncate text-base font-semibold text-white">{move.san}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
        <span className={`${cfg.color}`}>{cfg.label}</span>
        <span className="font-mono text-gray-500">{move.cpLoss} cp</span>
      </div>
    </div>
  )
})
