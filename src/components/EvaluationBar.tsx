import { evalToWinPercent } from '../utils/moveClassification'

interface Props {
  evaluation: number
  isMate: boolean
  mateIn: number | null
  isFlipped: boolean
}

export function EvaluationBar({ evaluation, isMate, mateIn, isFlipped }: Props) {
  const clamped = Math.max(-1000, Math.min(1000, evaluation))
  const whitePercent = evalToWinPercent(clamped)
  const blackHeight = isFlipped ? whitePercent : 100 - whitePercent
  const whiteHeight = isFlipped ? 100 - whitePercent : whitePercent

  const label = isMate
    ? mateIn != null
      ? `M${Math.abs(mateIn)}`
      : 'M'
    : evaluation > 0
      ? `+${(evaluation / 100).toFixed(1)}`
      : (evaluation / 100).toFixed(1)

  return (
    <div className="flex h-44 flex-col items-center select-none">
      <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gray-500">Eval</div>
      <div className="flex w-10 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25">
        <div
          className="bg-gray-900 transition-all duration-500"
          style={{ height: `${blackHeight}%` }}
        />
        <div
          className="bg-stone-100 transition-all duration-500"
          style={{ height: `${whiteHeight}%` }}
        />
      </div>
      <span className="mt-2 rounded-full bg-black/25 px-2 py-1 font-mono text-xs text-gray-200">{label}</span>
    </div>
  )
}
