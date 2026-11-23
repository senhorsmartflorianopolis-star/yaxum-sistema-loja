FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY servidor.js ./
COPY src ./src
COPY motor ./motor
COPY cerebro ./cerebro
# o estado (mensagens já respondidas) fica em /app/dados: monte um volume aqui
RUN mkdir -p /app/dados && chown -R node:node /app/dados
USER node
EXPOSE 3000
CMD ["node", "servidor.js"]
