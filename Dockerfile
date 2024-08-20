ARG environment

FROM ubuntu:24.04 AS base

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y curl git jq && \
    apt-get clean

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get --no-install-recommends install -y nodejs && \
    apt-get clean
RUN npm install -g npm

WORKDIR /app

FROM base AS version-for-dev

FROM base AS version-for-prod
RUN mkdir -p /app
COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./server ./server
COPY ./src ./src
RUN npm install --ignore-scripts

FROM version-for-${environment} AS final

CMD [ "/usr/bin/npm", "start" ]