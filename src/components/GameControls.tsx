interface Props {
  onNewGame: () => void
  onFlipBoard: () => void
  onUndoMove: () => void
  isAnalyzing: boolean
}

export function GameControls({ onNewGame, onFlipBoard, onUndoMove, isAnalyzing }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={onNewGame}
        className="flex-1 px-3 py-2 bg-chess-dark hover:bg-green-700 text-white rounded font-medium text-sm transition-colors"
      >
        Nouvelle partie
      </button>
      <button
        onClick={onUndoMove}
        disabled={isAnalyzing}
        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded font-medium text-sm transition-colors"
      >
        Annuler coup
      </button>
      <button
        onClick={onFlipBoard}
        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium text-sm transition-colors"
      >
        Retourner
      </button>
    </div>
  )
}
