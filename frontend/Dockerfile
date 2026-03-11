FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN rm -f next.config.ts && test -f next.config.mjs

EXPOSE 3000
CMD ["sh", "-c", "rm -f next.config.ts && npx next dev -H 0.0.0.0 -p 3000"]
