import { useState } from 'react';
import { Download, FileVideo, FolderOpen, Music, RefreshCw, Trash2 } from 'lucide-react';
import { formatBytes } from './DownloadsPanel';

export default function FilesPanel({ files, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (name) => {
    if (!window.confirm(`Apagar "${name}"?`)) return;
    setDeleting(name);
    try {
      await fetch(`/api/files?path=${encodeURIComponent(name)}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  if (!files.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
        <FolderOpen className="h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-500">Ainda não há ficheiros baixados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-sm text-slate-400">{files.length} ficheiro{files.length > 1 ? 's' : ''}</span>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>
      <ul className="divide-y divide-slate-800">
        {files.map((f) => {
          const isAudio = /\.(mp3|m4a|opus|wav|flac)$/i.test(f.name);
          return (
            <li key={f.name} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-800/40">
              {isAudio ? (
                <Music className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <FileVideo className="h-5 w-5 shrink-0 text-red-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{f.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(f.size)}</p>
              </div>
              <a
                href={`/api/files/download?path=${encodeURIComponent(f.name)}`}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-emerald-600 hover:text-white"
                title="Baixar"
              >
                <Download className="h-4 w-4" /> Guardar
              </a>
              <button
                onClick={() => handleDelete(f.name)}
                disabled={deleting === f.name}
                className="rounded-lg bg-slate-800 p-2 text-slate-400 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
                title="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
