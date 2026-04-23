import { useState } from 'react'
import { useStockfish } from './hooks/useStockfish'
import { useChessGame } from './hooks/useChessGame'
import { ChessBoard } from './components/ChessBoard'
import { EvaluationBar } from './components/EvaluationBar'
import { EloSelector } from './components/EloSelector'
import { MoveAnalysis } from './components/MoveAnalysis'
import { MoveHistory } from './components/MoveHistory'
import { GameControls } from './components/GameControls'

export default function App() {
  const [elo, setElo] = useState(1500)
  const { isReady, evaluation, analyze, getBestMove } = useStockfish()
  const {
    fen,
    analyzedMoves,
    isAnalyzing,
    bestMoveArrow,
    boardFlipped,
    gameOver,
    makeMove,
    resetGame,
    undoMove,
    flipBoard,
  } = useChessGame(analyze, getBestMove, elo)

  const lastMove = analyzedMoves.length > 0 ? analyzedMoves[analyzedMoves.length - 1] : null

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      <header className="bg-panel-bg border-b border-panel-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          ♟ Chess Helper
        </h1>
        <div className="text-sm text-gray-400">
          {!isReady ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Chargement moteur…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Stockfish 16 prêt
            </span>
          )}
        </div>
      </header>

      <EloSelector elo={elo} onChange={setElo} />

      <main className="flex flex-1 gap-4 p-4 items-start justify-center flex-wrap">
        <EvaluationBar
          evaluation={evaluation?.score ?? 0}
          isMate={evaluation?.isMate ?? false}
          mateIn={evaluation?.mateIn ?? null}
          isFlipped={boardFlipped}
        />

        <div className="flex flex-col items-center gap-2">
          <ChessBoard
            fen={fen}
            onMove={makeMove}
            bestMoveArrow={bestMoveArrow}
            isFlipped={boardFlipped}
            isAnalyzing={isAnalyzing}
            gameOver={gameOver}
          />
          {gameOver && (
            <div className="text-center text-lg font-bold text-yellow-400 bg-yellow-900/30 px-4 py-2 rounded-lg w-full">
              Partie terminée !
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 w-64">
          <MoveAnalysis
            lastMove={lastMove}
            evaluation={evaluation}
            isAnalyzing={isAnalyzing}
          />
          <div className="bg-panel-bg border border-panel-border rounded-lg p-3">
            <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-2">
              Historique
            </h3>
            <MoveHistory moves={analyzedMoves} />
          </div>
          <GameControls
            onNewGame={resetGame}
            onFlipBoard={flipBoard}
            onUndoMove={undoMove}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </main>
    </div>
  )
}
