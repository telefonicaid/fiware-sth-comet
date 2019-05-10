# Copyright 2015 Telefónica Investigación y Desarrollo, S.A.U
#
# This file is part of the Short Time Historic (STH) component
#
# STH is free software: you can redistribute it and/or
# modify it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the License,
# or (at your option) any later version.
#
# STH is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public
# License along with STH.
# If not, see http://www.gnu.org/licenses/.
#
# For those usages not covered by the GNU Affero General Public License
# please contact with: [german.torodelvalle@telefonica.com]

ARG NODE_VERSION=8.16.0-slim
FROM node:${NODE_VERSION}

MAINTAINER FIWARE STH Team. Telefónica I+D

COPY . /opt/sth/
WORKDIR /opt/sth

RUN \
  apt-get update && \
  apt-get install -y git && \
  npm install pm2@3.2.2 -g && \
  echo "INFO: npm install --production..." && \
  cd /opt/sth && npm install --production && \
  # Clean apt cache
  apt-get clean && \
  apt-get remove -y git && \
  apt-get -y autoremove

EXPOSE 8666

USER node
ENV NODE_ENV=production

ENTRYPOINT ["pm2-runtime", "bin/sth"]
CMD ["-- ", "config.js"]
