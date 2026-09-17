# ---------- Estágio 1: compilar o frontend ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci
COPY frontend ./frontend
RUN npm --prefix frontend run build

# ---------- Estágio 2: runtime com yt-dlp + ffmpeg ----------
FROM node:20-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev
COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

ENV PORT=3001
EXPOSE 3001
CMD ["node", "backend/server.js"]
