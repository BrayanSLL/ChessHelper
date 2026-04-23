import { ELO_PRESETS } from '../types/chess'

interface Props {
  elo: number
  onChange: (elo: number) => void
}

export function EloSelector({ elo, onChange }: Props) {
  return (
    <div className="bg-panel-bg border-b border-panel-border px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="text-gray-400 text-sm whitespace-nowrap">Niveau adversaire</span>
        <span className="text-white font-bold text-sm w-12 text-center">{elo}</span>
      </div>
      <input
        type="range"
        min={800}
        max={3000}
        step={10}
        value={elo}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-36 accent-chess-dark"
      />
      <div className="flex flex-wrap gap-1.5">
        {ELO_PRESETS.map((preset) => (
          <button
            key={preset.elo}
            onClick={() => onChange(preset.elo)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              elo === preset.elo
                ? 'bg-chess-dark text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
