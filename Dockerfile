FROM node:0.10.39

MAINTAINER Germán Toro del Valle <german.torodelvalle@telefonica.com>

RUN mkdir /github && mkdir /github/telefonicaid

WORKDIR /github/telefonicaid
RUN git clone https://github.com/telefonicaid/IoT-STH.git

WORKDIR  /github/telefonicaid/IoT-STH
RUN git fetch && git checkout release/0.1.0 && npm install

EXPOSE 8666

WORKDIR /github/telefonicaid/IoT-STH
CMD ["npm", "start"]
