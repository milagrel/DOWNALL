import { CheckCircle2, Clock3, FileAudio, Film, Loader2, XCircle } from 'lucide-react';

const STATUS_META = {
  queued: { icon: Clock3, color: 'text-slate-400', label: 'Na fila' },
  downloading: { icon: Loader2, color: 'text-blue-400', label: 'A baixar' },
  done: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Concluído' },
  error: { icon: XCircle, color: 'text-red-400', label: 'Erro' },
};

export default function DownloadsPanel({ downloads }) {
  return (
    <div className="space-y-3">
      {downloads.map((d) => {
        const meta = STATUS_META[d.status] || STATUS_META.queued;
        const Icon = meta.icon;
        const isActive = d.status === 'downloading' || d.status === 'queued';
        return (
          <div key={d.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className="flex items-center gap-3">
              <span className={`shrink-0 ${meta.color}`}>
                {d.format === 'mp3' ? (
                  <FileAudio className="h-5 w-5" />
                ) : (
                  <Film className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{d.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <Icon className={`h-3.5 w-3.5 ${d.status === 'downloading' ? 'animate-spin' : ''}`} />
                  <span className={meta.color}>{meta.label}</span>
                  {d.status === 'downloading' && d.speed && <span>· {d.speed}</span>}
                  {d.status === 'downloading' && d.eta && <span>· falta {d.eta}</span>}
                  {d.status === 'done' && d.size > 0 && (
                    <span>· {formatBytes(d.size)}</span>
                  )}
                </p>
                {d.status === 'error' && d.error && (
                  <p className="mt-1 truncate text-xs text-red-400">{d.error}</p>
                )}
              </div>
              {isActive && (
                <span className="shrink-0 text-sm font-semibold text-white">{Math.round(d.progress)}%</span>
              )}
            </div>
            {isActive && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                  style={{ width: `${Math.max(2, d.progress)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function formatBytes(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
