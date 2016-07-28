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

FROM centos:6

MAINTAINER Germán Toro del Valle <german.torodelvalle@telefonica.com>

COPY . /opt/sth
WORKDIR /opt/sth

RUN yum update -y && yum install -y curl \
  && yum install -y epel-release && yum update -y epel-release \

#  && yum install -y npm \
&& echo "INFO: Building node and npm..." \
# && yum install -y gcc gcc-c++ automake autoconf libtoolize make \
&& yum install -y gcc-c++ make \
&& curl -s --fail http://nodejs.org/dist/v0.10.42/node-v0.10.42.tar.gz -o /opt/sth/node-v0.10.42.tar.gz \
&& tar zxf node-v0.10.42.tar.gz \
&& cd node-v0.10.42 \
&& echo "INFO: Configure..." && ./configure \
&& echo "INFO: Make..." && make -s V= \
&& echo "INFO: Make install..." && make install \
&& echo "INFO: node version <$(node -e "console.log(process.version)")>" \
&& echo "INFO: npm version <$(npm --version)>" \
&& cd /opt/sth \
&& rm -rf /opt/sth/node-v0.10.42.tar.gz /opt/sth/node-v0.10.42 \




  && echo "INFO: npm install --production..." && npm install --production \
  && rpm -e --nodeps redhat-logos || true && yum -y erase libss \
  && yum clean all && rm -rf /var/lib/yum/yumdb \
  && rm -rf /var/lib/yum/history && find /usr/share/locale -mindepth 1 -maxdepth 1 ! -name 'en' ! -name 'es' ! -name 'es_ES' | xargs rm -r \
  && rm -f /var/log/*log && npm cache clean

ENTRYPOINT bin/sth

EXPOSE 8666

