FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=768
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]