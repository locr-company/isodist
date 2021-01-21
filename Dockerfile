# base image
FROM ubuntu:18.04

RUN apt-get -y update && apt-get -y upgrade && apt-get -y install git curl wget gcc g++ make htop
RUN wget https://deb.nodesource.com/setup_12.x -O nodejs_12.x.sh && bash nodejs_12.x.sh
RUN apt-get install -y nodejs

# copy application to docker container
COPY . /isodist
WORKDIR /isodist

RUN npm set unsafe-perm true
RUN npm install

#RUN mkdir -p osrm && wget https://download.geofabrik.de/

# execute command to start server
CMD ["npm", "run", "start"]
