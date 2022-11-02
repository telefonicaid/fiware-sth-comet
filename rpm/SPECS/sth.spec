Summary: Short Time Historic (STH)
Name: fiware-sth-comet
Version: %{_product_version}
Release: %{_product_release}
License: AGPLv3
BuildRoot: %{_topdir}/BUILDROOT/
BuildArch: x86_64
Requires: nodejs >= 0.10.42
Requires: logrotate
Requires(post): /sbin/chkconfig, /usr/sbin/useradd, npm
Requires(preun): /sbin/chkconfig, /sbin/service
Requires(postun): /sbin/service
Group: Applications/Engineering
Vendor: Telefonica I+D
BuildRequires: npm

# HISTORY CHANGES
# CJMM-DevOps 2016/03/21

%description
The Short Time Historic (STH, aka. Comet) is a component of the FIWARE ecosystem in charge of providing aggregated time series information about the evolution in time of entity attribute values registered using the Orion Context Broker, an implementation of the publish/subscribe context management system exposing NGSI9 and NGSI10 interfaces.

# System folders
%define _srcdir $RPM_BUILD_ROOT/../../..
%define _project_user sth
%define _service_name sth
%define _install_dir /opt/sth
%define _sth_log_dir /var/log/sth
%define _sth_pid_dir /var/run/sth

# RPM Building folder
%define _build_root_project %{buildroot}%{_install_dir}
# -------------------------------------------------------------------------------------------- #
# prep section, setup macro:
# -------------------------------------------------------------------------------------------- #
%prep
echo "[INFO] Preparing installation"
# Create rpm/BUILDROOT folder
rm -Rf $RPM_BUILD_ROOT && mkdir -p $RPM_BUILD_ROOT
[ -d %{_build_root_project} ] || mkdir -p %{_build_root_project}

# Copy src files
cp -R %{_srcdir}/lib \
      %{_srcdir}/bin \
      %{_srcdir}/config.js \
      %{_srcdir}/package.json \
      %{_build_root_project}

[ -f %{_srcdir}/npm-shrinkwrap.json ] && /bin/cp %{_srcdir}/npm-shrinkwrap.json %{_build_root_project}

cp -R %{_topdir}/SOURCES/etc %{buildroot}

# Create conf dir
mkdir -p %{_build_root_project}/conf

# -------------------------------------------------------------------------------------------- #
# Build section:
# -------------------------------------------------------------------------------------------- #
%build
echo "[INFO] Building RPM"
cd %{_build_root_project}

# Only production modules. We have found that --force is required to make this work for Node v8
rm -fR node_modules/
npm cache clear --force
npm install --production

# -------------------------------------------------------------------------------------------- #
# pre-install section:
# -------------------------------------------------------------------------------------------- #
%pre
echo "[INFO] Creating %{_project_user} user"
grep ^%{_project_user}: /etc/passwd
RET_VAL=$?
if [ "$RET_VAL" != "0" ]; then
      /usr/sbin/useradd -s "/bin/bash" -d %{_install_dir} %{_project_user}
      RET_VAL=$?
      if [ "$RET_VAL" != "0" ]; then
         echo "[ERROR] Unable create %{_project_user} user" \
         exit $RET_VAL
      fi

fi

# -------------------------------------------------------------------------------------------- #
# post-install section:
# -------------------------------------------------------------------------------------------- #
%post
echo "[INFO] Configuring application"

    echo "[INFO] Creating the home Short Time Historic (STH) directory"
    mkdir -p _install_dir
    echo "[INFO] Creating log & run directory"
    mkdir -p %{_sth_log_dir}
    chown -R %{_project_user}:%{_project_user} %{_sth_log_dir}
    chown -R %{_project_user}:%{_project_user} _install_dir
    chmod g+s %{_sth_log_dir}
    setfacl -d -m g::rwx %{_sth_log_dir}
    setfacl -d -m o::rx %{_sth_log_dir}

    mkdir -p %{_sth_pid_dir}
    chown -R %{_project_user}:%{_project_user} %{_sth_pid_dir}
    chown -R %{_project_user}:%{_project_user} _install_dir
    chmod g+s %{_sth_pid_dir}
    setfacl -d -m g::rwx %{_sth_pid_dir}
    setfacl -d -m o::rx %{_sth_pid_dir}

    echo "[INFO] Configuring application service"
    cd /etc/init.d
    chkconfig --add %{_service_name}

echo "Done"

# -------------------------------------------------------------------------------------------- #
# pre-uninstall section:
# -------------------------------------------------------------------------------------------- #
%preun

echo "[INFO] stoping service %{_service_name}"
service %{_service_name} stop &> /dev/null

if [ $1 == 0 ]; then

  echo "[INFO] Removing application log files"
  # Log
  [ -d %{_sth_log_dir} ] && rm -rfv %{_sth_log_dir}

  echo "[INFO] Removing application run files"
  # Log
  [ -d %{_sth_pid_dir} ] && rm -rfv %{_sth_pid_dir}

  echo "[INFO] Removing application files"
  # Installed files
  [ -d %{_install_dir} ] && rm -rfv %{_install_dir}

  echo "[INFO] Removing application user"
  userdel -fr %{_project_user}

  echo "[INFO] Removing application service"
  chkconfig --del %{_service_name}
  rm -Rf /etc/init.d/%{_service_name}
  echo "Done"
fi

# -------------------------------------------------------------------------------------------- #
# post-uninstall section:
# clean section:
# -------------------------------------------------------------------------------------------- #
%postun
%clean
rm -rf $RPM_BUILD_ROOT

# -------------------------------------------------------------------------------------------- #
# Files to add to the RPM
# -------------------------------------------------------------------------------------------- #
%files
%defattr(755,%{_project_user},%{_project_user},755)
%config /etc/init.d/%{_service_name}
%config /etc/logrotate.d/logrotate-sth-daily.conf
%{_install_dir}

%changelog
* Wed Nov 02 2022 Alvaro Vega <alvaro.vegagarcia@telefonica.com> 2.10.0
- Fix: healthcheck over sth exposed port 
- Fix: Dockerfile to include initial packages upgrade
- Set Nodejs 12 as minimum version in packages.json (effectively removing Nodev8 and Nodev10 from supported versions)

* Fri Mar 25 2022 Fermin Galan <fermin.galanmarquez@telefonica.com> 2.9.0
- Add: graceful shutdown listening to SIGTERM and SIGHUP signals (#576)
- Add: Docker healthcheck for STH API
- Add: config reconnectTries and reconnectInterval configuration (env vars DB_RECONNECT_TRIES and DB_RECONNECT_INTERVAL) to allow mongo driver reconnect (#559)
- Add: allow connect with mongo uri without auth
- Fix: return 500 when DB is not connected (#570)
- Fix: ensure permissions over temp directory (used by CSV generation) in docker container (issue re-introduced in 2.8.0)
- Fix: update logs about get raw and aggregated data (#556)
- Update codebase to use ES6
    -  Remove JSHint and jshint overrides
    -  Add esLint using standard tamia presets
    -  Replace var with let/const
    -  Fix or disable eslint errors
- Upgrade logops dep from 2.1.0 to 2.1.2 due to colors dependency corruption
- Upgrade: mongodb dependence from ~2.2.35 to ~3.6.12 (#567)
- Upgrade NodeJS version from 10.19.0 to 14-slim in Dockerfile

* Wed May 27 2020 Alvaro Vega <alvaro.vegagarcia@telefonica.com> 2.8.0
- Fix: Filetype issue fixed for hLimit and hOffset (#539)
- Fix: Updated temporary csv filename for uniqueness (#532)
- Upgrade NodeJS version from 8.16.1 to 10.19.0 in Dockerfile due to Node 8 End-of-Life
- Make optional PM2 usage in docker entrypoint
- Add: MongoDB auth source configuration (env var DB_AUTH_SOURCE)

* Mon Nov 11 2019 Fermin Galan <fermin.galanmarquez@telefonica.com> 2.7.0
- Add: NGSIv2 endpoints for the raw and aggregation API operations (#118)
- Add: CORS support (#500)
- Fix: check header response before use it (CSV response has no header)
- Fix: handler for reply a CSV: use new Hapi API (#513)
- Fix: Ensure permissions over temp directory (used by CSV generation) in docker container (#514)
- Upgrade NodeJS version from 8.16.0 to 8.16.1 in Dockerfile due to security issues

* Tue Jun 04 2019 Fermin Galan <fermin.galanmarquez@telefonica.com> 2.6.0
- Upgrade NodeJS version from 8.12.0 to 8.16.0 in Dockerfile due to improve security
- Add: logging feature to count number of requests attended and number of requests processed with error (#310)
- Fix: race condition causes erroneous count to 0 in some cases (#493)

* Wed Dec 19 2018 Fermin Galan <fermin.galanmarquez@telefonica.com> 2.5.0
- Set Nodejs 8.12.0 as minimum version in packages.json (effectively removing Nodev4 and Nodev6 as supported versions)
- Add: use NodeJS 8 in Dockerfile
- Add: use PM2 in Dockerfile
- Upgrade: hapi dependence from ~11.1.3 to ~16.7.0
- Upgrade: logops dependence from ~1.0.5 to 2.1.0
- Upgrade: joi dependence from ~5.1.0 to 14.0.6
- Upgrade: boom dependence from ~2.7.2 to 7.2.2
- Upgrade: json-csv dependence from ~1.2.0 to 1.5.0
- Upgrade: request development dependence from ~2.79.0 to 2.88.0
- Upgrade: mocha development depencence from ~3.2.0 to 5.2.0
- Remove: old unused development dependencies (chai, sinon, sinon-chai, grunt and grunt related module)

* Thu Aug 16 2018 Alvaro Vega <alvaro.vegagarcia@telefonica.com> 2.4.0
- Upgrade lodash dependence to 4.17.5
- Upgrade mongodb dependence to 2.2.35
- Check & ensure hLimit<=lastN<=config.maxPageSize for raw data query. [#431]
- Fix: Content Disposition header encoding issue (#433)
- Add count to query and related fiware-total-count header [#428]
- Using precise dependencies (~=) in packages.json
- Upgrade hapi to 11.1.3

* Wed Oct 18 2017 Fermin Galan <fermin.galanmarquez@telefonica.com> 2.3.0
- FEATURE update node version to 4.8.4
