FROM node:0.10.43

MAINTAINER Germán Toro del Valle <german.torodelvalle@telefonica.com>

RUN mkdir /github && mkdir /github/telefonicaid

WORKDIR /github/telefonicaid
RUN git clone https://github.com/telefonicaid/fiware-sth-comet.git

WORKDIR  /github/telefonicaid/fiware-sth-comet
RUN git fetch && git checkout master && npm install

EXPOSE 8666

WORKDIR /github/telefonicaid/fiware-sth-comet
CMD ["npm", "start"]
