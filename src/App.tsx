import { useState } from 'react'
import { useStockfish } from './hooks/useStockfish'
import { useChessGame } from './hooks/useChessGame'
import { ChessBoard } from './components/ChessBoard'
import { EloSelector } from './components/EloSelector'
import { MoveAnalysis } from './components/MoveAnalysis'
import { MoveHistory } from './components/MoveHistory'
import { GameControls } from './components/GameControls'
import { BoardStatusPanel } from './components/BoardStatusPanel'
import { CapturedPiecesBar } from './components/CapturedPiecesBar'
import { LiveEvalChart } from './components/LiveEvalChart'
import { GameReviewSummary } from './components/GameReviewSummary'

export default function App() {
  const [elo, setElo] = useState(1500)
  const { isReady, evaluation, analyze, getBestMove } = useStockfish()
  const {
    fen,
    boardKey,
    analyzedMoves,
    gameSnapshot,
    gameResult,
    isAnalyzing,
    boardFlipped,
    gameOver,
    isValidMove,
    makeMove,
    resetGame,
    undoMove,
    flipBoard,
  } = useChessGame(analyze, getBestMove, elo)

  const lastMove = analyzedMoves.length > 0 ? analyzedMoves[analyzedMoves.length - 1] : null
  const topSide = boardFlipped ? gameSnapshot.white : gameSnapshot.black
  const bottomSide = boardFlipped ? gameSnapshot.black : gameSnapshot.white
  const whiteLead = gameSnapshot.black.lostMaterial - gameSnapshot.white.lostMaterial
  const topLead =
    topSide.color === 'w'
      ? Math.max(0, whiteLead)
      : Math.max(0, -whiteLead)
  const bottomLead =
    bottomSide.color === 'w'
      ? Math.max(0, whiteLead)
      : Math.max(0, -whiteLead)

  return (
    <div className="min-h-screen bg-[#181512] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(156,163,175,0.08),_transparent_28%),radial-gradient(circle_at_right,_rgba(120,150,86,0.12),_transparent_32%)] pointer-events-none" />
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-panel-border bg-panel-bg/95 px-4 py-3 backdrop-blur">
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

      <div className="relative">
        <EloSelector elo={elo} onChange={setElo} />

        <main className="mx-auto flex w-full max-w-[1580px] flex-1 flex-col gap-4 p-4 xl:flex-row xl:items-start">
          <BoardStatusPanel
            evaluation={evaluation}
            snapshot={gameSnapshot}
            isFlipped={boardFlipped}
          />

          <section className="flex min-w-0 flex-1 flex-col gap-3 xl:max-w-[720px]">
            <CapturedPiecesBar side={topSide} materialLead={topLead} position="top" />

            <div className="rounded-[30px] border border-panel-border bg-panel-bg/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <ChessBoard
                key={boardKey}
                fen={fen}
                onMove={makeMove}
                isValidMove={isValidMove}
                isFlipped={boardFlipped}
                isAnalyzing={isAnalyzing}
                gameOver={gameOver}
              />
            </div>

            <CapturedPiecesBar side={bottomSide} materialLead={bottomLead} position="bottom" />

            {gameOver && (
              <div className="w-full rounded-2xl bg-yellow-900/30 px-4 py-3 text-center text-lg font-bold text-yellow-300">
                Partie terminee !
              </div>
            )}
          </section>

          <aside className="flex w-full flex-col gap-3 xl:w-[460px]">
            <GameReviewSummary
              moves={analyzedMoves}
              gameResult={gameResult}
              isVisible={gameOver}
            />

            <MoveAnalysis
              lastMove={lastMove}
              evaluation={evaluation}
              isAnalyzing={isAnalyzing}
            />

            <section className="rounded-[28px] border border-panel-border bg-panel-bg/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-gray-300">
                  Coups et dynamique
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Blancs et Noirs sont maintenant separes clairement, avec le graphe d&apos;evaluation juste a cote.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:items-start">
                <MoveHistory moves={analyzedMoves} />
                <LiveEvalChart moves={analyzedMoves} />
              </div>
            </section>

            <GameControls
              onNewGame={resetGame}
              onFlipBoard={flipBoard}
              onUndoMove={undoMove}
              isAnalyzing={isAnalyzing}
            />
          </aside>
        </main>
      </div>
    </div>
  )
}
