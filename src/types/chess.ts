export type MoveQuality =
  | 'brilliant'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'unknown'

export interface AnalyzedMove {
  san: string
  lan: string
  from: string
  to: string
  quality: MoveQuality
  cpLoss: number
  evalBefore: number
  evalAfter: number
  bestMove: string | null
  moveNumber: number
  color: 'w' | 'b'
}

export interface EvaluationResult {
  score: number
  depth: number
  bestMove: string
  isMate: boolean
  mateIn: number | null
}

export interface EloPreset {
  label: string
  elo: number
}

export const ELO_PRESETS: EloPreset[] = [
  { label: 'Très facile', elo: 100 },
  { label: 'Débutant', elo: 400 },
  { label: 'Novice', elo: 800 },
  { label: 'Club', elo: 1200 },
  { label: 'Intermédiaire', elo: 1500 },
  { label: 'Avancé', elo: 1800 },
  { label: 'Expert', elo: 2200 },
  { label: 'Maître', elo: 2700 },
]

export const MOVE_QUALITY_CONFIG: Record<
  MoveQuality,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  brilliant: {
    label: 'Brillant',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/40',
    icon: '!!',
  },
  best: {
    label: 'Meilleur',
    color: 'text-green-400',
    bgColor: 'bg-green-900/40',
    icon: '!',
  },
  excellent: {
    label: 'Excellent',
    color: 'text-green-300',
    bgColor: 'bg-green-900/30',
    icon: '★',
  },
  good: {
    label: 'Bon',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30',
    icon: '✓',
  },
  inaccuracy: {
    label: 'Imprécision',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30',
    icon: '?!',
  },
  mistake: {
    label: 'Erreur',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/30',
    icon: '?',
  },
  blunder: {
    label: 'Gaffe',
    color: 'text-red-500',
    bgColor: 'bg-red-900/40',
    icon: '??',
  },
  unknown: {
    label: '...',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800/30',
    icon: '…',
  },
}
