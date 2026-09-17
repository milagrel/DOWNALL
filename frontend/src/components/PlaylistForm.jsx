import { Link2, Loader2, Search } from 'lucide-react';

export const FORMATS = [
  { value: 'best', label: 'Melhor qualidade (MP4)' },
  { value: '1080', label: '1080p (MP4)' },
  { value: '720', label: '720p (MP4)' },
  { value: '480', label: '480p (MP4)' },
  { value: 'mp3', label: 'Áudio MP3' },
];

export default function PlaylistForm({ url, setUrl, format, setFormat, onAnalyze, analyzing }) {
  return (
    <form onSubmit={onAnalyze} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cola o link da playlist ou vídeo do YouTube…"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/70 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20"
          />
        </div>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/60"
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={analyzing || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-900/40 transition hover:from-red-400 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {analyzing ? 'A analisar…' : 'Analisar'}
        </button>
      </div>
    </form>
  );
}
