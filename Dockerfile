ARG environment

FROM node:20 AS base

WORKDIR /app

FROM base AS version-for-dev

FROM base AS version-for-prod
COPY src ./src
COPY server ./server
COPY package.json ./
COPY package-lock.json ./
RUN npm install --ignore-scripts

FROM version-for-${environment} AS final

CMD [ "npm", "start" ]