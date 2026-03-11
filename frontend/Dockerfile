FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN rm -f next.config.ts next.config.mjs && test -f next.config.js

EXPOSE 3000
CMD ["sh", "-c", "rm -f next.config.ts next.config.mjs && npx next dev -H 0.0.0.0 -p 3000"]
