FROM node:22.1.0-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN apt-get update && apt-get install -y ffmpeg curl python3
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp
RUN curl -fsSL https://deno.land/install.sh | sh
COPY . .
EXPOSE 3000
CMD ["npm", "start"]