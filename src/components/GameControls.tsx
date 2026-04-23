interface Props {
  onNewGame: () => void
  onFlipBoard: () => void
  onUndoMove: () => void
  isAnalyzing: boolean
}

export function GameControls({ onNewGame, onFlipBoard, onUndoMove, isAnalyzing }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={onNewGame}
        className="rounded-2xl bg-chess-dark px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        Nouvelle partie
      </button>
      <button
        onClick={onUndoMove}
        disabled={isAnalyzing}
        className="rounded-2xl bg-gray-700 px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-40"
      >
        Annuler coup
      </button>
      <button
        onClick={onFlipBoard}
        className="rounded-2xl bg-gray-700 px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-600"
      >
        Retourner
      </button>
    </div>
  )
}
