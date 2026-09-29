import express from 'express';
import cors from 'cors';
import archiver from 'archiver';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const COOKIES_FILE = path.join(__dirname, 'cookies.txt');
const PORT = process.env.PORT || 3001;
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const EXTRACTOR_ARGS = process.env.YTDLP_EXTRACTOR_ARGS || 'youtube:player_client=android,web_embedded';
const MAX_CONCURRENT = 3;

const app = express();
app.use(cors());
app.use(express.json());

await fs.mkdir(DOWNLOADS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Gestor de downloads (fila com limite de concorrência)
// ---------------------------------------------------------------------------
const downloads = new Map(); // id -> estado do download
const queue = [];
let activeCount = 0;

async function hasCookies() {
  try {
    await fs.access(COOKIES_FILE);
    return true;
  } catch {
    return false;
  }
}

async function baseArgs() {
  const args = ['--no-warnings', '--extractor-args', EXTRACTOR_ARGS];
  if (await hasCookies()) args.push('--cookies', COOKIES_FILE);
  return args;
}

function sanitize(name) {
  return String(name)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'download';
}

async function formatArgs(format, url, outputTemplate) {
  const args = ['--no-playlist', '--newline', '--windows-filenames', ...(await baseArgs()), '-o', outputTemplate];
  if (format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    const height = format === 'best' ? '' : format; // '1080' | '720' | '480'
    const f = height
      ? `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
      : 'bestvideo*+bestaudio/best';
    args.push('-f', f, '--merge-output-format', 'mp4');
  }
  args.push('--retries', '3', '--fragment-retries', '3');
  args.push(
    '--progress-template',
    'download:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    url
  );
  return args;
}

function extractVideoId(url) {
  const m = String(url).match(/[?&]v=([\w-]{6,})/);
  return m ? m[1] : null;
}

async function findOutputFile(outputDir, videoId) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.isFile() && e.name.includes(`[${videoId}]`)) {
      const full = path.join(outputDir, e.name);
      const stat = await fs.stat(full);
      return { name: e.name, size: stat.size };
    }
  }
  return null;
}

async function runDownload(dl) {
  const { url, format, outputDir } = dl;
  const outputTemplate = path.join(outputDir, '%(title).80B [%(id)s].%(ext)s');
  const videoId = extractVideoId(url);

  dl.status = 'downloading';
  const child = spawn(YTDLP, await formatArgs(format, url, outputTemplate), { windowsHide: true });

  child.stdout.on('data', (buf) => {
    const text = buf.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.startsWith('download:')) {
        const [, pct, speed, eta] = line.slice(9).split('|');
        dl.progress = Math.min(100, parseFloat(pct) || 0);
        dl.speed = speed && speed !== 'Unknown' ? speed : '';
        dl.eta = eta && eta !== 'Unknown' ? eta : '';
      } else if (line.startsWith('[download] Destination:')) {
        dl.filename = path.basename(line.slice(line.indexOf(':') + 1).trim());
      }
    }
  });

  child.stderr.on('data', (buf) => {
    const m = buf.toString().match(/ERROR:\s*(.+)/);
    if (m) dl.error = m[1].trim();
  });

  child.on('close', async (code) => {
    if (code === 0) {
      dl.status = 'done';
      dl.progress = 100;
      dl.speed = '';
      dl.eta = '';
      if (videoId) {
        const found = await findOutputFile(outputDir, videoId);
        if (found) {
          dl.filename = found.name;
          dl.size = found.size;
        }
      }
    } else {
      dl.status = 'error';
      dl.error = dl.error || `yt-dlp terminou com código ${code}`;
    }
    activeCount--;
    processQueue();
  });
}

function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    activeCount++;
    runDownload(job);
  }
}

function startDownload({ url, title, format, playlistTitle }) {
  const id = crypto.randomUUID();
  const folder = playlistTitle ? sanitize(playlistTitle) : '';
  const outputDir = folder ? path.join(DOWNLOADS_DIR, folder) : DOWNLOADS_DIR;
  fs.mkdir(outputDir, { recursive: true }).catch(() => {});

  const dl = {
    id,
    url,
    title: title || 'Vídeo',
    format,
    status: 'queued',
    progress: 0,
    speed: '',
    eta: '',
    filename: '',
    size: 0,
    error: null,
    outputDir,
  };
  downloads.set(id, dl);
  queue.push(dl);
  processQueue();
  return id;
}

// ---------------------------------------------------------------------------
// Endpoints da API
// ---------------------------------------------------------------------------

// Análise de playlist/vídeo (rápida, usa --flat-playlist)
app.get('/api/info', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL em falta' });

  const child = spawn(YTDLP, ['--flat-playlist', '--dump-single-json', ...(await baseArgs()), url], {
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));

  child.on('close', (code) => {
    if (code !== 0) {
      const m = stderr.match(/ERROR:\s*(.+)/);
      return res.status(500).json({ error: m ? m[1].trim() : 'Falha ao analisar o link' });
    }
    try {
      const info = JSON.parse(stdout);
      const entries = info.entries || [info];
      const items = entries
        .filter((e) => e && e.id)
        .map((e) => ({
          id: e.id,
          title: e.title || 'Sem título',
          duration: e.duration || null,
          thumbnail: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${e.id}`,
        }));
      res.json({
        isPlaylist: Array.isArray(info.entries),
        title: info.playlist_title || info.title || 'Playlist',
        channel: info.channel || info.uploader || '',
        count: items.length,
        items,
      });
    } catch {
      res.status(500).json({ error: 'Erro ao interpretar a resposta do yt-dlp' });
    }
  });
});

// Pesquisa de vídeos no YouTube (ytsearch)
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Termo de pesquisa em falta' });

  const child = spawn(YTDLP, ['--dump-single-json', ...(await baseArgs()), `ytsearch20:${q}`], {
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));

  child.on('close', (code) => {
    if (code !== 0) {
      const m = stderr.match(/ERROR:\s*(.+)/);
      return res.status(500).json({ error: m ? m[1].trim() : 'Falha na pesquisa' });
    }
    try {
      const info = JSON.parse(stdout);
      const entries = info.entries || [];
      const items = entries
        .filter((e) => e && e.id)
        .map((e) => ({
          id: e.id,
          title: e.title || 'Sem título',
          duration: e.duration || null,
          thumbnail: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${e.id}`,
        }));
      res.json({
        isPlaylist: true,
        title: `Resultados para "${q}"`,
        channel: 'Pesquisa YouTube',
        count: items.length,
        items,
      });
    } catch {
      res.status(500).json({ error: 'Erro ao interpretar a resposta do yt-dlp' });
    }
  });
});

// Cookies do browser (para contornar bloqueio 403 em servidores cloud)
app.get('/api/cookies', async (req, res) => {
  res.json({ active: await hasCookies() });
});

app.post('/api/cookies', express.text({ limit: '2mb' }), async (req, res) => {
  const content = req.body || '';
  if (!content.includes('Netscape')) {
    return res.status(400).json({ error: 'Ficheiro de cookies inválido (formato Netscape)' });
  }
  await fs.writeFile(COOKIES_FILE, content, 'utf8');
  res.json({ ok: true });
});

app.delete('/api/cookies', async (req, res) => {
  await fs.unlink(COOKIES_FILE).catch(() => {});
  res.json({ ok: true });
});

// Iniciar download de um vídeo
app.post('/api/downloads', (req, res) => {
  const { url, title, format = 'best', playlistTitle } = req.body;
  if (!url) return res.status(400).json({ error: 'URL em falta' });
  const id = startDownload({ url, title, format, playlistTitle });
  res.json({ id });
});

// Listar downloads (estado + progresso)
app.get('/api/downloads', (req, res) => {
  const list = [...downloads.values()].map((d) => ({
    id: d.id,
    title: d.title,
    format: d.format,
    status: d.status,
    progress: d.progress,
    speed: d.speed,
    eta: d.eta,
    filename: d.filename,
    size: d.size,
    error: d.error,
  }));
  res.json(list);
});

// Listar ficheiros baixados
async function walk(dir, base = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const rel = base ? path.join(base, e.name) : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, rel)));
    } else {
      const stat = await fs.stat(full);
      out.push({ name: rel, size: stat.size, mtime: stat.mtimeMs });
    }
  }
  return out;
}

app.get('/api/files', async (req, res) => {
  try {
    res.json(await walk(DOWNLOADS_DIR));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function resolveSafe(rel) {
  const full = path.resolve(DOWNLOADS_DIR, rel);
  const root = path.resolve(DOWNLOADS_DIR) + path.sep;
  if (!full.startsWith(root)) return null;
  return full;
}

app.get('/api/files/download-all', async (req, res) => {
  try {
    const files = await walk(DOWNLOADS_DIR);
    if (!files.length) return res.status(404).json({ error: 'Sem ficheiros para guardar' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="baido-downloads.zip"');
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
    archive.pipe(res);
    for (const f of files) {
      archive.file(path.join(DOWNLOADS_DIR, f.name), { name: f.name });
    }
    await archive.finalize();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/files/download', async (req, res) => {
  const full = resolveSafe(req.query.path || '');
  if (!full) return res.status(400).json({ error: 'Caminho inválido' });
  try {
    await fs.access(full);
    res.download(full, path.basename(full));
  } catch {
    res.status(404).json({ error: 'Ficheiro não encontrado' });
  }
});

app.delete('/api/files', async (req, res) => {
  const full = resolveSafe(req.query.path || '');
  if (!full) return res.status(400).json({ error: 'Caminho inválido' });
  try {
    await fs.unlink(full);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Ficheiro não encontrado' });
  }
});

// ---------------------------------------------------------------------------
// Servir o frontend compilado (se existir)
// ---------------------------------------------------------------------------
const dist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Frontend não compilado. Corre: npm run build' });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend a correr em http://localhost:${PORT}`);
  console.log(`📁 Downloads: ${DOWNLOADS_DIR}`);
});
