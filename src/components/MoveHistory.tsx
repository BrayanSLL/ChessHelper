import { useEffect, useRef } from 'react'
import { MOVE_QUALITY_CONFIG } from '../types/chess'
import type { AnalyzedMove } from '../types/chess'

interface Props {
  moves: AnalyzedMove[]
}

export function MoveHistory({ moves }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length])

  // Group moves into pairs (white, black)
  const pairs: { white?: AnalyzedMove; black?: AnalyzedMove; num: number }[] = []
  for (const move of moves) {
    if (move.color === 'w') {
      pairs.push({ white: move, num: move.moveNumber })
    } else {
      const last = pairs[pairs.length - 1]
      if (last && !last.black) {
        last.black = move
      } else {
        pairs.push({ black: move, num: move.moveNumber })
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
    <div className="overflow-y-auto max-h-[260px] rounded-[24px] border border-white/6 bg-black/20">
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
            <MoveChip move={pair.white} sideLabel="Blancs" />
          ) : (
            <span className="flex-1" />
          )}
          {pair.black ? <MoveChip move={pair.black} sideLabel="Noirs" /> : <span className="flex-1" />}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function MoveChip({ move, sideLabel }: { move: AnalyzedMove; sideLabel: string }) {
  const cfg = MOVE_QUALITY_CONFIG[move.quality]
  return (
    <div
      className={`min-w-0 rounded-2xl border border-white/5 px-3 py-2 ${cfg.bgColor}`}
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
}
