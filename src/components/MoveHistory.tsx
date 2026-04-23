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
      <div className="text-gray-500 text-sm text-center py-4">
        Aucun coup joué
      </div>
    )
  }

  return (
    <div className="overflow-y-auto max-h-48 space-y-0.5">
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-1 text-sm">
          <span className="text-gray-500 w-6 text-right shrink-0">{pair.num}.</span>
          {pair.white ? (
            <MoveChip move={pair.white} />
          ) : (
            <span className="flex-1" />
          )}
          {pair.black ? <MoveChip move={pair.black} /> : null}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function MoveChip({ move }: { move: AnalyzedMove }) {
  const cfg = MOVE_QUALITY_CONFIG[move.quality]
  return (
    <span
      className={`flex-1 flex items-center gap-1 px-2 py-0.5 rounded ${cfg.bgColor}`}
      title={`${cfg.label} (perte: ${move.cpLoss} cp)`}
    >
      <span className="text-white font-medium">{move.san}</span>
      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
    </span>
  )
}
