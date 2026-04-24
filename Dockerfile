FROM node:24-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node_modules/.bin/next start -p 3000 2>&1"]
