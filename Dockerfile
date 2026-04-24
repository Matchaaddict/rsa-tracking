FROM node:24-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# bust layer cache
COPY . .
RUN npm run build

EXPOSE 3000

CMD sh -c "echo '=== Container boot ===' && echo PORT=${PORT:-3000} && echo DATABASE_URL=$DATABASE_URL && npx prisma migrate deploy && npx prisma db seed && echo '=== Starting Next.js on 0.0.0.0:'${PORT:-3000}' ===' && exec node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"
