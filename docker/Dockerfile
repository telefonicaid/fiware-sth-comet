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

ARG NODEJS_VERSION=v0.10.42

COPY . /opt/sth
WORKDIR /opt/sth

RUN yum update -y && yum install -y curl \
  && yum install -y epel-release && yum update -y epel-release \
  && echo "INFO: Building node and npm..." \
  && yum install -y gcc-c++ make \
  && echo "***********************************************************" \
  && echo "USING NODEJS VERSION <${NODEJS_VERSION}>" \
  && echo "***********************************************************" \
  && curl -s --fail http://nodejs.org/dist/${NODEJS_VERSION}/node-${NODEJS_VERSION}.tar.gz -o /opt/sth/node-${NODEJS_VERSION}.tar.gz \
  && tar zxf node-${NODEJS_VERSION}.tar.gz \
  && cd node-${NODEJS_VERSION} \
  && echo "INFO: Configure..." && ./configure \
  && echo "INFO: Make..." && make -s V= \
  && echo "INFO: Make install..." && make install \
  && echo "INFO: node version <$(node -e "console.log(process.version)")>" \
  && echo "INFO: npm version <$(npm --version)>" \
  && cd /opt/sth \
  && echo "INFO: npm install --production..." && npm install --production \

  && echo "INFO: Cleaning unused software..." \
  && yum erase -y gcc-c++ gcc ppl cpp glibc-devel glibc-headers kernel-headers libgomp libstdc++-devel mpfr libss \
  && rm -rf /opt/sth/node-${NODEJS_VERSION}.tar.gz /opt/sth/node-${NODEJS_VERSION} \
  # Erase without dependencies of the document formatting system (man). This cannot be removed using yum 
  # as yum uses hard dependencies and doing so will uninstall essential packages
  && rpm -qa groff redhat-logos | xargs -r rpm -e --nodeps \
  # Clean yum data
  && yum clean all && rm -rf /var/lib/yum/yumdb && rm -rf /var/lib/yum/history \
  # Rebuild rpm data files
  && rpm -vv --rebuilddb \
  # Delete unused locales. Only preserve en_US and the locale aliases
  && find /usr/share/locale -mindepth 1 -maxdepth 1 ! -name 'en_US' ! -name 'locale.alias' | xargs -r rm -r \
  && bash -c 'localedef --list-archive | grep -v -e "en_US" | xargs localedef --delete-from-archive' \
  # We use cp instead of mv as to refresh locale changes for ssh connections
  # We use /bin/cp instead of cp to avoid any alias substitution, which in some cases has been problematic
  && /bin/cp -f /usr/lib/locale/locale-archive /usr/lib/locale/locale-archive.tmpl \
  && build-locale-archive \
  # Clean npm cache
  && npm cache clean \
  # Don't need unused files inside docker images
  && rm -rf /tmp/* /usr/local/lib/node_modules/npm/man /usr/local/lib/node_modules/npm/doc /usr/local/lib/node_modules/npm/html \
  # We don't need to manage Linux account passwords requisites: lenght, mays/mins, etc
  # This cannot be removed using yum as yum uses hard dependencies and doing so will uninstall essential packages
  && rm -rf /usr/share/cracklib \
  # We don't need glibc locale data
  # This cannot be removed using yum as yum uses hard dependencies and doing so will uninstall essential packages
  && rm -rf /usr/share/i18n /usr/{lib,lib64}/gconv \
  # Don't need old log files inside docker images
  && rm -f /var/log/*log


ENTRYPOINT bin/sth

EXPOSE 8666
