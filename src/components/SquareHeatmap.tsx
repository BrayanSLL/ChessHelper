import type { AnalyzedMove } from '../types/chess'

interface Props {
  moves: AnalyzedMove[]
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

export function SquareHeatmap({ moves }: Props) {
  if (moves.length === 0) return null

  const counts: Record<string, number> = {}
  for (const m of moves) {
    counts[m.from] = (counts[m.from] ?? 0) + 1
    counts[m.to] = (counts[m.to] ?? 0) + 1
  }

  const maxCount = Math.max(1, ...Object.values(counts))

  return (
    <div className="rounded-[24px] border border-white/6 bg-black/20 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-gray-500">Activité des cases</p>
      <svg viewBox="0 0 8 8" className="w-full rounded-lg overflow-hidden" style={{ imageRendering: 'pixelated' }}>
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = file + rank
            const isDark = (fi + ri) % 2 === 1
            const base = isDark ? '#769656' : '#eeeed2'
            const intensity = (counts[sq] ?? 0) / maxCount
            return (
              <g key={sq}>
                <rect x={fi} y={ri} width={1} height={1} fill={base} />
                {intensity > 0 && (
                  <rect
                    x={fi}
                    y={ri}
                    width={1}
                    height={1}
                    fill={`rgba(239,68,68,${(intensity * 0.72).toFixed(3)})`}
                  />
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}
