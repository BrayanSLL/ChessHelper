interface Props {
  onNewGame: (color: 'white' | 'black' | 'random') => void
  onFlipBoard: () => void
  onUndoMove: () => void
  onExportPgn: () => void
  isAnalyzing: boolean
}

export function GameControls({ onNewGame, onFlipBoard, onUndoMove, onExportPgn, isAnalyzing }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* New game – color choice */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => onNewGame('white')}
          className="rounded-2xl bg-stone-200 px-2 py-2.5 text-xs font-semibold text-gray-900 transition-colors hover:bg-stone-100"
          title="Jouer avec les Blancs"
        >
          ♔ Blancs
        </button>
        <button
          onClick={() => onNewGame('random')}
          className="rounded-2xl bg-chess-dark px-2 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
          title="Couleur aléatoire"
        >
          🎲 Aléatoire
        </button>
        <button
          onClick={() => onNewGame('black')}
          className="rounded-2xl bg-gray-800 px-2 py-2.5 text-xs font-semibold text-white border border-white/10 transition-colors hover:bg-gray-700"
          title="Jouer avec les Noirs"
        >
          ♚ Noirs
        </button>
      </div>

      {/* Other controls */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={onUndoMove}
          disabled={isAnalyzing}
          className="rounded-2xl bg-gray-700 px-2 py-2.5 text-xs font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-40"
        >
          ↩ Annuler
        </button>
        <button
          onClick={onFlipBoard}
          className="rounded-2xl bg-gray-700 px-2 py-2.5 text-xs font-medium text-white transition-colors hover:bg-gray-600"
        >
          ⇅ Retourner
        </button>
        <button
          onClick={onExportPgn}
          className="rounded-2xl bg-gray-700 px-2 py-2.5 text-xs font-medium text-white transition-colors hover:bg-gray-600"
          title="Exporter la partie en PGN"
        >
          ↓ PGN
        </button>
      </div>
    </div>
  )
}
