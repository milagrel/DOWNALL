# 🎬 Playlist Downloader

Web app para baixar **playlists e vídeos do YouTube** em alta qualidade — inspirado no 4K Video Downloader+.

## Stack

- **Frontend**: React 18 + Vite + TailwindCSS v4 + Lucide icons
- **Backend**: Node.js + Express
- **Motor de download**: [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg (para juntar vídeo+áudio)

## Funcionalidades

- ✅ Análise rápida de playlists (título, canal, duração, miniaturas)
- ✅ Suporte a vídeos individuais e playlists completas
- ✅ Seleção individual ou "selecionar todos"
- ✅ Formatos: Melhor qualidade, 1080p, 720p, 480p (MP4) e Áudio MP3
- ✅ Downloads em fila (máx. 3 em simultâneo) com progresso, velocidade e tempo restante
- ✅ Organização automática em pastas por playlist
- ✅ Gestão de ficheiros: guardar no PC ou apagar

## Requisitos

- [Node.js](https://nodejs.org) 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) no PATH (ou definir `YTDLP_PATH`)
- [ffmpeg](https://ffmpeg.org) no PATH (necessário para MP4 em alta qualidade e MP3)

## Como correr

```bash
# 1. Instalar dependências (raiz + backend + frontend)
npm run install:all

# 2. Modo desenvolvimento (backend :3001 + frontend :5173)
npm run dev
```

Abre **http://localhost:5173**

### Produção (backend serve o frontend compilado)

```bash
npm run build
npm start        # http://localhost:3001
```

## Estrutura

```
yt-playlist-downloader/
├── backend/
│   ├── server.js        # API + fila de downloads com yt-dlp
│   └── downloads/       # ficheiros baixados (criada automaticamente)
├── frontend/
│   └── src/
│       ├── App.jsx                      # lógica principal
│       └── components/                  # PlaylistForm, VideoGrid, DownloadsPanel, FilesPanel
└── package.json          # scripts raiz (dev, build, start)
```

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/info?url=` | Analisa playlist/vídeo (rápido, `--flat-playlist`) |
| POST | `/api/downloads` | Inicia download `{ url, title, format, playlistTitle }` |
| GET | `/api/downloads` | Estado/progresso dos downloads |
| GET | `/api/files` | Lista ficheiros baixados |
| GET | `/api/files/download?path=` | Descarrega ficheiro |
| DELETE | `/api/files?path=` | Apaga ficheiro |

## Deploy online (Render)

O app corre inteiro num único servidor (UI + backend + yt-dlp + ffmpeg) via Docker.

1. Faz push do repositório para o GitHub
2. No [Render](https://render.com): **New → Web Service → liga o repositório**
3. O Render deteta o `Dockerfile` automaticamente (ou usa o blueprint `render.yaml`)
4. Plano grátis é suficiente para começar

> **Nota:** no plano grátis do Render o disco é efémero — os ficheiros baixados são temporários (o utilizador guarda-os no PC pelo browser) e o serviço "adormece" após ~15 min de inatividade.

## Notas legais

Baixa apenas conteúdo para o qual tens direitos (domínio público, Creative Commons, ou com autorização do autor). Respeita os termos de serviço do YouTube.
