import { useCallback, useEffect, useRef, useState } from 'react';
import { Youtube, Download, FolderDown, AlertTriangle } from 'lucide-react';
import PlaylistForm from './components/PlaylistForm';
import VideoGrid from './components/VideoGrid';
import DownloadsPanel from './components/DownloadsPanel';
import FilesPanel from './components/FilesPanel';

export default function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('best');
  const [analyzing, setAnalyzing] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [downloads, setDownloads] = useState([]);
  const [files, setFiles] = useState([]);
  const [starting, setStarting] = useState(false);
  const prevStatuses = useRef({});

  const hasActive = downloads.some((d) => d.status === 'queued' || d.status === 'downloading');

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) setFiles(await res.json());
    } catch {
      /* backend offline */
    }
  }, []);

  const fetchDownloads = useCallback(async () => {
    try {
      const res = await fetch('/api/downloads');
      if (res.ok) setDownloads(await res.json());
    } catch {
      /* backend offline */
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Polling de progresso enquanto houver downloads ativos
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(fetchDownloads, 1000);
    return () => clearInterval(t);
  }, [hasActive, fetchDownloads]);

  // Atualizar ficheiros quando um download termina
  useEffect(() => {
    let changed = false;
    for (const d of downloads) {
      const prev = prevStatuses.current[d.id];
      if (prev && prev !== 'done' && d.status === 'done') changed = true;
      prevStatuses.current[d.id] = d.status;
    }
    if (changed) fetchFiles();
  }, [downloads, fetchFiles]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAnalyzing(true);
    setError('');
    setInfo(null);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao analisar o link');
      setInfo(data);
      setSelected(new Set(data.items.map((i) => i.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleVideo = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === info.items.length ? new Set() : new Set(info.items.map((i) => i.id))));
  };

  const handleDownload = async () => {
    const items = info.items.filter((i) => selected.has(i.id));
    if (!items.length) return;
    setStarting(true);
    setError('');
    try {
      await Promise.all(
        items.map((item) =>
          fetch('/api/downloads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: item.url,
              title: item.title,
              format,
              playlistTitle: info.isPlaylist ? info.title : null,
            }),
          })
        )
      );
      await fetchDownloads();
    } catch (err) {
      setError('Falha ao iniciar os downloads: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40">
          <Youtube className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            <span className="text-red-400">Baido</span> — Baixar Tudo
          </h1>
          <p className="text-sm text-slate-400">Playlists e vídeos do YouTube em alta qualidade</p>
        </div>
      </header>

      {/* Formulário */}
      <PlaylistForm
        url={url}
        setUrl={setUrl}
        format={format}
        setFormat={setFormat}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultado da análise */}
      {info && (
        <div className="mt-8">
          <VideoGrid
            info={info}
            selected={selected}
            onToggle={toggleVideo}
            onToggleAll={toggleAll}
          />

          <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-900/90 px-5 py-4 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-white">{selectedCount}</span> de {info.items.length} vídeos selecionados
            </div>
            <button
              onClick={handleDownload}
              disabled={!selectedCount || starting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-900/40 transition hover:from-red-400 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-5 w-5" />
              {starting ? 'A iniciar...' : `Baixar ${selectedCount} vídeo${selectedCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Downloads ativos */}
      {downloads.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Download className="h-5 w-5 text-red-400" /> Downloads
          </h2>
          <DownloadsPanel downloads={downloads} />
        </section>
      )}

      {/* Ficheiros baixados */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <FolderDown className="h-5 w-5 text-blue-400" /> Ficheiros baixados
        </h2>
        <FilesPanel files={files} onRefresh={fetchFiles} />
      </section>
    </div>
  );
}
