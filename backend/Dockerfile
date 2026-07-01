FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Instalación reproducible a partir del lockfile versionado
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Railway inyecta su propio $PORT; el servidor lo lee con process.env.PORT
EXPOSE 5000

CMD ["npm", "start"]
