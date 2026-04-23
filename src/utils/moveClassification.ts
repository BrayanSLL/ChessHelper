import type { MoveQuality } from '../types/chess'

export function classifyMove(
  cpBefore: number,
  cpAfter: number,
  turn: 'w' | 'b',
  engineTopMove: string | null,
  actualMove: string,
): { quality: MoveQuality; cpLoss: number } {
  // CP loss: how much eval dropped for the side that moved (white-positive frame)
  const cpLoss =
    turn === 'w'
      ? Math.max(0, cpBefore - cpAfter)
      : Math.max(0, cpAfter - cpBefore)

  const isEngineBestMove =
    engineTopMove !== null && actualMove === engineTopMove

  let quality: MoveQuality

  if (isEngineBestMove && cpLoss <= 5) {
    quality = 'best'
  } else if (cpLoss <= 10) {
    quality = 'excellent'
  } else if (cpLoss <= 25) {
    quality = 'good'
  } else if (cpLoss <= 50) {
    quality = 'inaccuracy'
  } else if (cpLoss <= 150) {
    quality = 'mistake'
  } else {
    quality = 'blunder'
  }

  return { quality, cpLoss }
}

export function normalizeScore(score: number, turn: 'w' | 'b'): number {
  return turn === 'w' ? score : -score
}

export function evalToWinPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}
