import { MOVE_QUALITY_CONFIG } from '../types/chess'
import type { AnalyzedMove, GameResult, MoveQuality } from '../types/chess'

interface Props {
  moves: AnalyzedMove[]
  gameResult: GameResult
  isVisible: boolean
}

const QUALITY_ORDER: MoveQuality[] = [
  'brilliant',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
]

// ACPL → estimated ELO lookup table (linear interpolation)
// Shifted down vs. Lichess reference: depth-18 penalises sub-optimal moves
// harder, so the same ACPL corresponds to a lower practical ELO.
const ACPL_ELO_TABLE: [number, number][] = [
  [0, 2800],
  [5, 2500],
  [12, 2200],
  [22, 2000],
  [40, 1700],
  [65, 1400],
  [100, 1100],
  [150, 900],
  [220, 700],
  [320, 500],
  [460, 300],
  [650, 100],
]

function estimateElo(moves: AnalyzedMove[]): number | null {
  if (moves.length < 3) return null
  const acpl = moves.reduce((sum, m) => sum + m.cpLoss, 0) / moves.length

  for (let i = 0; i < ACPL_ELO_TABLE.length - 1; i++) {
    const [acpl0, elo0] = ACPL_ELO_TABLE[i]
    const [acpl1, elo1] = ACPL_ELO_TABLE[i + 1]
    if (acpl <= acpl1) {
      const t = (acpl - acpl0) / (acpl1 - acpl0)
      return Math.round(elo0 + t * (elo1 - elo0))
    }
  }
  return 200
}

function formatAccuracy(moves: AnalyzedMove[]) {
  if (moves.length === 0) return 0
  const total = moves.reduce((sum, move) => {
    const penalty = Math.min(move.cpLoss, 300) / 3
    return sum + Math.max(0, 100 - penalty)
  }, 0)
  return Math.round((total / moves.length) * 10) / 10
}

function getBestMove(moves: AnalyzedMove[]) {
  return [...moves]
    .sort((a, b) => {
      if (a.cpLoss !== b.cpLoss) return a.cpLoss - b.cpLoss
      return Math.abs(b.evalAfter - b.evalBefore) - Math.abs(a.evalAfter - a.evalBefore)
    })[0] ?? null
}

function getWorstMove(moves: AnalyzedMove[]) {
  return [...moves].sort((a, b) => b.cpLoss - a.cpLoss)[0] ?? null
}

function getQualityCounts(moves: AnalyzedMove[]) {
  const counts = Object.fromEntries(QUALITY_ORDER.map((quality) => [quality, 0])) as Record<MoveQuality, number>
  for (const move of moves) {
    if (move.quality in counts) counts[move.quality] += 1
  }
  return counts
}

function getSideLabel(color: 'w' | 'b') {
  return color === 'w' ? 'Blancs' : 'Noirs'
}

export function GameReviewSummary({ moves, gameResult, isVisible }: Props) {
  const whiteMoves = moves.filter((move) => move.color === 'w')
  const blackMoves = moves.filter((move) => move.color === 'b')
  const whiteAccuracy = formatAccuracy(whiteMoves)
  const blackAccuracy = formatAccuracy(blackMoves)
  const whiteCounts = getQualityCounts(whiteMoves)
  const blackCounts = getQualityCounts(blackMoves)
  const whiteElo = estimateElo(whiteMoves)
  const blackElo = estimateElo(blackMoves)
  const bestMove = getBestMove(moves)
  const worstMove = getWorstMove(moves)

  return (
    <section className={`rounded-[28px] border border-panel-border bg-panel-bg/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${isVisible ? '' : 'opacity-90'}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-gray-300">Bilan</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isVisible ? gameResult.label : 'Le resume complet apparaitra a la fin de la partie.'}
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
          gameResult.outcome === 'white'
            ? 'bg-stone-100 text-gray-900'
            : gameResult.outcome === 'black'
              ? 'bg-gray-900 text-stone-100 border border-white/10'
              : 'bg-amber-400/15 text-amber-300'
        }`}>
          {gameResult.outcome === 'white'
            ? 'Blancs'
            : gameResult.outcome === 'black'
              ? 'Noirs'
              : isVisible
                ? 'Nulle'
                : 'En cours'}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AccuracyCard side="Blancs" accuracy={whiteAccuracy} counts={whiteCounts} estimatedElo={whiteElo} />
        <AccuracyCard side="Noirs" accuracy={blackAccuracy} counts={blackCounts} estimatedElo={blackElo} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <HighlightCard
          label="Meilleur coup"
          move={bestMove}
          emptyLabel="Pas assez de coups pour degager un meilleur coup."
          positive
        />
        <HighlightCard
          label="Moment critique"
          move={worstMove}
          emptyLabel="Pas encore de coup critique."
        />
      </div>
    </section>
  )
}

function AccuracyCard({
  side,
  accuracy,
  counts,
  estimatedElo,
}: {
  side: string
  accuracy: number
  counts: Record<MoveQuality, number>
  estimatedElo: number | null
}) {
  return (
    <div className="rounded-[24px] border border-white/6 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-gray-500">{side}</div>
          <div className="mt-1 text-3xl font-semibold text-white">{accuracy}%</div>
          {estimatedElo !== null && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">ELO estimé</span>
              <span className="text-sm font-bold text-amber-300">~{estimatedElo}</span>
            </div>
          )}
        </div>
        <div className="h-14 w-14 rounded-full border-4 border-emerald-400/60 bg-emerald-500/10 flex items-center justify-center text-sm font-semibold text-emerald-300">
          {Math.round(accuracy)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {QUALITY_ORDER.filter((quality) => counts[quality] > 0).map((quality) => {
          const cfg = MOVE_QUALITY_CONFIG[quality]
          return (
            <div key={quality} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
              <div className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</div>
              <div className="mt-1 text-lg font-semibold text-white">{counts[quality]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HighlightCard({
  label,
  move,
  emptyLabel,
  positive = false,
}: {
  label: string
  move: AnalyzedMove | null
  emptyLabel: string
  positive?: boolean
}) {
  if (!move) {
    return (
      <div className="rounded-[24px] border border-white/6 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-gray-500">{label}</div>
        <div className="mt-2 text-sm text-gray-500">{emptyLabel}</div>
      </div>
    )
  }

  const cfg = MOVE_QUALITY_CONFIG[move.quality]
  return (
    <div className="rounded-[24px] border border-white/6 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.24em] text-gray-500">{label}</div>
        <div className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-white">{move.san}</div>
          <div className="mt-1 text-sm text-gray-400">
            {getSideLabel(move.color)} • coup {move.moveNumber}
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${positive ? 'bg-emerald-500/12 text-emerald-300' : 'bg-red-500/12 text-red-300'}`}>
          {positive ? `${move.cpLoss} cp de perte` : `${move.cpLoss} cp perdus`}
        </div>
      </div>
    </div>
  )
}
