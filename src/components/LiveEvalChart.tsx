import { MOVE_QUALITY_CONFIG } from '../types/chess'
import type { AnalyzedMove } from '../types/chess'

interface Props {
  moves: AnalyzedMove[]
}

const CHART_WIDTH = 280
const CHART_HEIGHT = 180
const PADDING_X = 18
const PADDING_Y = 18
const MAX_ABS_CP = 900

function clampEval(value: number) {
  return Math.max(-MAX_ABS_CP, Math.min(MAX_ABS_CP, value))
}

function pointY(evalCp: number) {
  const normalized = (clampEval(evalCp) + MAX_ABS_CP) / (MAX_ABS_CP * 2)
  return CHART_HEIGHT - PADDING_Y - normalized * (CHART_HEIGHT - PADDING_Y * 2)
}

export function LiveEvalChart({ moves }: Props) {
  if (moves.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-[24px] border border-white/6 bg-black/20 text-sm text-gray-500">
        Le graphe apparaitra des que les coups seront joues.
      </div>
    )
  }

  const step = moves.length > 1 ? (CHART_WIDTH - PADDING_X * 2) / (moves.length - 1) : 0
  const points = moves.map((move, index) => ({
    ...move,
    x: PADDING_X + index * step,
    y: pointY(move.evalAfter),
  }))

  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = [
    `${PADDING_X},${CHART_HEIGHT / 2}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${CHART_HEIGHT / 2}`,
  ].join(' ')

  return (
    <div className="rounded-[24px] border border-white/6 bg-[#231f1b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-gray-500">Tendance</div>
          <div className="text-sm font-semibold text-white">Evaluation en direct</div>
        </div>
        <div className="text-xs text-gray-400">Centipions</div>
      </div>

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-[180px] w-full overflow-visible">
        <defs>
          <linearGradient id="evalArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <line
          x1={PADDING_X}
          y1={CHART_HEIGHT / 2}
          x2={CHART_WIDTH - PADDING_X}
          y2={CHART_HEIGHT / 2}
          stroke="#6b655d"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <line
          x1={PADDING_X}
          y1={PADDING_Y}
          x2={PADDING_X}
          y2={CHART_HEIGHT - PADDING_Y}
          stroke="#5a544d"
          strokeWidth="1"
        />
        <polygon points={area} fill="url(#evalArea)" />
        <polyline
          points={line}
          fill="none"
          stroke="#f2efe9"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point) => {
          const cfg = MOVE_QUALITY_CONFIG[point.quality]
          const strokeColor =
            point.quality === 'blunder'
              ? '#ef4444'
              : point.quality === 'mistake'
                ? '#fb923c'
                : point.quality === 'inaccuracy'
                  ? '#facc15'
                  : '#84cc16'

          return (
            <g key={`${point.lan}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="5" fill="#231f1b" stroke={strokeColor} strokeWidth="2.5" />
              <title>{`${point.moveNumber}. ${point.san} - ${cfg.label}`}</title>
            </g>
          )
        })}

        <text x={CHART_WIDTH - PADDING_X} y={PADDING_Y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">
          Blancs
        </text>
        <text x={CHART_WIDTH - PADDING_X} y={CHART_HEIGHT - PADDING_Y + 2} textAnchor="end" fill="#9ca3af" fontSize="10">
          Noirs
        </text>
      </svg>
    </div>
  )
}
