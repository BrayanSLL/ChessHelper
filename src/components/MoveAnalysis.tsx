import { Chess } from 'chess.js'
import { MOVE_QUALITY_CONFIG } from '../types/chess'
import type { AnalyzedMove, EvaluationResult } from '../types/chess'

export interface Alternative {
  move: string
  score: number
  isMate: boolean
}

interface Props {
  lastMove: AnalyzedMove | null
  evaluation: EvaluationResult | null
  isAnalyzing: boolean
  alternatives?: Alternative[] | null
  reviewedMove?: AnalyzedMove | null
}

function lanToSan(fen: string, lan: string | null): string | null {
  if (!lan || lan.length < 4) return null
  try {
    const chess = new Chess(fen)
    const move = chess.move({ from: lan.slice(0, 2), to: lan.slice(2, 4), ...(lan[4] ? { promotion: lan[4] } : {}) })
    return move?.san ?? null
  } catch {
    return null
  }
}

function buildExplanation(move: AnalyzedMove): string {
  const bestSan = lanToSan(move.fenBefore, move.bestMove)

  switch (move.quality) {
    case 'blunder':
      return bestSan
        ? `Gaffe sévère (−${move.cpLoss} cp) — ${bestSan} était bien meilleur.`
        : `Gaffe sévère (−${move.cpLoss} cp). La position s'est effondrée.`
    case 'mistake':
      return bestSan
        ? `Erreur (−${move.cpLoss} cp) — ${bestSan} était préférable.`
        : `Erreur qui a affaibli la position (−${move.cpLoss} cp).`
    case 'inaccuracy':
      return bestSan
        ? `Légère imprécision — ${bestSan} était plus précis.`
        : `Coup légèrement imprécis.`
    case 'good':
      return 'Bon coup solide.'
    case 'excellent':
      return 'Excellent coup !'
    case 'best':
      return 'Meilleur coup de la position.'
    case 'brilliant':
      return 'Coup brillant — idée non évidente ou sacrifice !'
    default:
      return ''
  }
}

function scoreLabel(score: number, isMate: boolean): string {
  if (isMate) return score > 0 ? 'Mat+' : 'Mat−'
  const pawn = (score / 100).toFixed(2)
  return score >= 0 ? `+${pawn}` : pawn
}

export function MoveAnalysis({ lastMove, evaluation, isAnalyzing, alternatives, reviewedMove }: Props) {
  const displayMove = reviewedMove ?? lastMove

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

      {displayMove && !isAnalyzing && (
        <LastMoveCard move={displayMove} />
      )}

      {/* Alternatives for mistakes/blunders in review mode */}
      {reviewedMove && (reviewedMove.quality === 'mistake' || reviewedMove.quality === 'blunder') && (
        <AlternativesPanel alternatives={alternatives ?? null} fenBefore={reviewedMove.fenBefore} />
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

      {!displayMove && !isAnalyzing && (
        <p className="text-gray-500 text-sm">Jouez un coup pour l&apos;analyser.</p>
      )}
    </div>
  )
}

function LastMoveCard({ move }: { move: AnalyzedMove }) {
  const cfg = MOVE_QUALITY_CONFIG[move.quality]
  const explanation = buildExplanation(move)
  return (
    <div className={`rounded-[24px] border border-white/5 p-4 ${cfg.bgColor} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-white font-bold text-lg">{move.san}</span>
        <span className={`font-bold text-lg ${cfg.color}`}>{cfg.icon}</span>
      </div>
      <div className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</div>
      {explanation && (
        <p className="text-xs text-gray-300 leading-relaxed">{explanation}</p>
      )}
    </div>
  )
}

function AlternativesPanel({ alternatives, fenBefore }: { alternatives: Alternative[] | null; fenBefore: string }) {
  if (alternatives === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
        Calcul des alternatives…
      </div>
    )
  }
  if (alternatives.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Alternatives</p>
      {alternatives.map((alt, i) => {
        const san = lanToSan(fenBefore, alt.move) ?? alt.move
        return (
          <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5">
            <span className="text-sm font-mono text-gray-200">{san}</span>
            <span className="text-xs font-mono text-green-400">{scoreLabel(alt.score, alt.isMate)}</span>
          </div>
        )
      })}
    </div>
  )
}
