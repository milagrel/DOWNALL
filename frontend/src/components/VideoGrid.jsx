import { CheckSquare, Clock, ListVideo, Square } from 'lucide-react';

export function formatDuration(sec) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoGrid({ info, selected, onToggle, onToggleAll }) {
  const allSelected = selected.size === info.items.length;

  return (
    <div>
      {/* Cabeçalho da playlist */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            {info.isPlaylist && <ListVideo className="h-5 w-5 text-red-400" />}
            {info.title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {info.channel && <span className="text-slate-300">{info.channel} · </span>}
            {info.count} vídeo{info.count > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onToggleAll}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-red-500/50 hover:text-white"
        >
          {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4 text-red-400" />}
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>

      {/* Grelha de vídeos */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {info.items.map((v) => {
          const isSel = selected.has(v.id);
          return (
            <button
              key={v.id}
              onClick={() => onToggle(v.id)}
              className={`group overflow-hidden rounded-xl border text-left transition ${
                isSel
                  ? 'border-red-500/60 bg-red-500/10 shadow-lg shadow-red-900/20'
                  : 'border-slate-700/60 bg-slate-900/60 hover:border-slate-500'
              }`}
            >
              <div className="relative">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,' + encodeURIComponent(
                      `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='#1e293b'/><text x='50%' y='50%' fill='#475569' font-size='28' text-anchor='middle' dominant-baseline='middle'>🎬</text></svg>`
                    );
                  }}
                />
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                  <Clock className="h-3 w-3" />
                  {formatDuration(v.duration)}
                </span>
                <span
                  className={`absolute left-2 top-2 rounded-md p-1 transition ${
                    isSel ? 'bg-red-500 text-white' : 'bg-black/60 text-slate-300 group-hover:bg-black/80'
                  }`}
                >
                  {isSel ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
              </div>
              <p className="line-clamp-2 px-3 py-2.5 text-sm font-medium leading-snug text-slate-200">
                {v.title}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
