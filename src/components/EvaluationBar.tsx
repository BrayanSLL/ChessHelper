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
    <div className="flex flex-col items-center w-8 select-none">
      <div className="w-7 flex-1 rounded overflow-hidden flex flex-col border border-gray-700">
        <div
          className="bg-gray-900 transition-all duration-500"
          style={{ height: `${blackHeight}%` }}
        />
        <div
          className="bg-gray-100 transition-all duration-500"
          style={{ height: `${whiteHeight}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 mt-1 font-mono">{label}</span>
    </div>
  )
}
