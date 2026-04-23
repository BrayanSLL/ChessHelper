import { EvaluationBar } from './EvaluationBar'
import type { EvaluationResult, GameSnapshot } from '../types/chess'

interface Props {
  evaluation: EvaluationResult | null
  snapshot: GameSnapshot
  isFlipped: boolean
}

export function BoardStatusPanel({ evaluation, snapshot, isFlipped }: Props) {
  const activeSide = snapshot.turn === 'w' ? 'Blancs' : 'Noirs'
  const phaseLabel =
    snapshot.phase === 'opening'
      ? 'Ouverture'
      : snapshot.phase === 'middlegame'
        ? 'Milieu de partie'
        : 'Finale'

  const whiteLead = snapshot.black.lostMaterial - snapshot.white.lostMaterial
  const materialText =
    whiteLead === 0
      ? 'Materiel egal'
      : whiteLead > 0
        ? `Blancs +${whiteLead}`
        : `Noirs +${Math.abs(whiteLead)}`

  const evalLabel = evaluation?.isMate
    ? `Mat ${evaluation.mateIn != null ? `en ${Math.abs(evaluation.mateIn)}` : 'imminent'}`
    : evaluation
      ? `${evaluation.score > 0 ? '+' : ''}${(evaluation.score / 100).toFixed(2)}`
      : '--'

  return (
    <aside className="w-full lg:w-[240px] rounded-[28px] border border-panel-border bg-panel-bg/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-4">
        <EvaluationBar
          evaluation={evaluation?.score ?? 0}
          isMate={evaluation?.isMate ?? false}
          mateIn={evaluation?.mateIn ?? null}
          isFlipped={isFlipped}
        />
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gray-500">Etat</p>
          <div className="text-3xl font-semibold text-white">{evalLabel}</div>
          <div className="text-sm text-emerald-300">{materialText}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <StatusTile label="Trait" value={activeSide} accent="text-sky-300" />
        <StatusTile label="Phase" value={phaseLabel} accent="text-amber-300" />
        <StatusTile label="Coup" value={`${snapshot.fullmoveNumber}`} accent="text-white" />
        <StatusTile
          label="Profondeur"
          value={evaluation ? `${evaluation.depth} plies` : '--'}
          accent="text-gray-100"
        />
        <StatusTile
          label="Meilleur coup"
          value={evaluation?.bestMove || '--'}
          accent="text-lime-300"
          mono
        />
      </div>
    </aside>
  )
}

function StatusTile({
  label,
  value,
  accent,
  mono = false,
}: {
  label: string
  value: string
  accent: string
  mono?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.24em] text-gray-500">{label}</div>
      <div className={`mt-1 text-sm font-medium ${accent} ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
