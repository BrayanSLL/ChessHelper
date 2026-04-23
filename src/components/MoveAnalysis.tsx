import { MOVE_QUALITY_CONFIG } from '../types/chess'
import type { AnalyzedMove, EvaluationResult } from '../types/chess'

interface Props {
  lastMove: AnalyzedMove | null
  evaluation: EvaluationResult | null
  isAnalyzing: boolean
}

export function MoveAnalysis({ lastMove, evaluation, isAnalyzing }: Props) {
  return (
    <div className="rounded-[28px] border border-panel-border bg-panel-bg/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] space-y-4">
      <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-[0.26em]">
        Analyse
      </h3>

      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block w-3 h-3 rounded-full bg-chess-dark animate-pulse" />
          Analyse en cours…
        </div>
      )}

      {lastMove && !isAnalyzing && (
        <LastMoveCard move={lastMove} />
      )}

      {evaluation && !isAnalyzing && (
        <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
          <div>
            <span className="text-gray-400">Éval : </span>
            <span className="text-white font-mono">
              {evaluation.isMate
                ? `Mat en ${Math.abs(evaluation.mateIn ?? 0)}`
                : `${evaluation.score > 0 ? '+' : ''}${(evaluation.score / 100).toFixed(2)}`}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Profondeur : </span>
            <span className="text-white">{evaluation.depth}</span>
          </div>
          {evaluation.bestMove && (
            <div>
              <span className="text-gray-400">Meilleur coup : </span>
              <span className="text-green-400 font-mono">{evaluation.bestMove}</span>
            </div>
          )}
        </div>
      )}

      {!lastMove && !isAnalyzing && (
        <p className="text-gray-500 text-sm">Jouez un coup pour l&apos;analyser.</p>
      )}
    </div>
  )
}

function LastMoveCard({ move }: { move: AnalyzedMove }) {
  const cfg = MOVE_QUALITY_CONFIG[move.quality]
  return (
    <div className={`rounded-[24px] border border-white/5 p-4 ${cfg.bgColor}`}>
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-lg">{move.san}</span>
        <span className={`font-bold text-lg ${cfg.color}`}>{cfg.icon}</span>
      </div>
      <div className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</div>
      {move.cpLoss > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          Perte : {move.cpLoss} centipions
        </div>
      )}
    </div>
  )
}
