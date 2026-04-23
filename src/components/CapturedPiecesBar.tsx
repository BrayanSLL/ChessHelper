import type { PieceSymbol, SideMaterialState } from '../types/chess'

interface Props {
  side: SideMaterialState
  materialLead: number
  position: 'top' | 'bottom'
}

const PIECE_GLYPHS: Record<'w' | 'b', Record<PieceSymbol, string>> = {
  w: {
    k: '\u2654',
    q: '\u2655',
    r: '\u2656',
    b: '\u2657',
    n: '\u2658',
    p: '\u2659',
  },
  b: {
    k: '\u265A',
    q: '\u265B',
    r: '\u265C',
    b: '\u265D',
    n: '\u265E',
    p: '\u265F',
  },
}

export function CapturedPiecesBar({ side, materialLead, position }: Props) {
  const sideLabel = side.color === 'w' ? 'Blancs' : 'Noirs'
  const glyphs = PIECE_GLYPHS[side.color]
  const leadText = materialLead > 0 ? `+${materialLead}` : null
  const isTop = position === 'top'

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-panel-bg/90 px-4 py-3 ${isTop ? 'shadow-[0_12px_30px_rgba(0,0,0,0.16)]' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${side.color === 'w' ? 'bg-stone-100 text-gray-900' : 'bg-gray-900 text-stone-100'}`}>
          <span className="text-lg font-semibold">{sideLabel[0]}</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{sideLabel}</div>
          <div className="text-xs text-gray-400">
            {side.capturedByOpponent.length > 0 ? 'Pieces perdues' : 'Aucune piece perdue'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="flex min-h-[36px] flex-wrap items-center justify-end gap-1.5">
          {side.capturedByOpponent.length > 0 ? (
            side.capturedByOpponent.map((piece) => (
              <div key={`${piece.type}-${piece.count}`} className="flex items-center rounded-full border border-white/8 bg-black/20 px-2 py-1">
                <span className="text-xl leading-none text-gray-200">{glyphs[piece.type]}</span>
                {piece.count > 1 ? (
                  <span className="ml-1 text-xs font-semibold text-gray-400">x{piece.count}</span>
                ) : null}
                <span className="ml-2 text-xs font-semibold text-amber-300">{piece.value}</span>
              </div>
            ))
          ) : (
            <span className="text-sm text-gray-500">0</span>
          )}
        </div>
        {leadText ? (
          <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-semibold text-emerald-300">
            {leadText}
          </div>
        ) : null}
      </div>
    </div>
  )
}
