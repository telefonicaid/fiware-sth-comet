Summary: Package for Short Term History (a.k.a. STH)
Name: sth
Version:          %{_product_version}
Release:          %{_product_release}
License:          AGPLv3
BuildRoot:        %{_topdir}/BUILDROOT/
BuildArch:        x86_64
Requires(build):  /usr/bin/npm
Requires(post):   /usr/sbin/useradd
Requires(preun):  /sbin/service
Requires(postun): /sbin/service
Requires:         nodejs
Group:            Applications/sth
Vendor:           Telefonica I+D

%description
The STH component is a FIWARE component in charge of providing aggregated time 
series information about the evolution in time of entity attribute values 
registered using the Orion Context Broker

# Project information
%define _project_name sth
%define _project_user sth
%define _service_name sth

# System folders
%define _srcdir $RPM_BUILD_ROOT/../../../..
%define _install_dir /usr/%{_project_name}
%define _log_dir %{_localstatedir}/log/%{_project_name}

# RPM Building folder
# -------------------------------------------------------------------------------------------- #
# prep section, setup macro:
# -------------------------------------------------------------------------------------------- #
%prep
echo "[INFO] Preparing installation"
# Create rpm/BUILDROOT folder
rm -Rf %{buildroot} && mkdir -p %{buildroot}
[ ! -d %{buildroot}/%{_install_dir} ] && mkdir -p %{buildroot}/%{_install_dir}

# Copy src files
cp -R %{_srcdir}/src \
      %{_srcdir}/package.json \
      %{buildroot}/%{_install_dir}

# Copy service and config files
cp -R %{_sourcedir}/* %{buildroot}

# -------------------------------------------------------------------------------------------- #
# Build section:
# -------------------------------------------------------------------------------------------- #
%build
echo "[INFO] Building RPM"
cd %{buildroot}/%{_install_dir}

# Only production modules
rm -fR node_modules/
npm cache clear
npm install --production

# -------------------------------------------------------------------------------------------- #
# pre-install section:
# -------------------------------------------------------------------------------------------- #
%pre
/bin/grep ^%{_project_user}:  /etc/group > /dev/null 2>&1
if [ $? != 0 ]
then
  /usr/sbin/groupadd -r -f %{_project_user}
  if [ $? != 0 ]
  then
    echo "Problems creating group %{_project_user}. Exiting."
    exit -1
  fi
fi
echo "[INFO] Creating %{_project_user} user"
/usr/bin/id %{_project_user} > /dev/null 2>&1
if [ $? != 0 ]
then
  /usr/sbin/useradd -d %{_install_dir} -g %{_project_user} -M -r -s /bin/bash  %{_project_user}
  if [ $? != 0 ]
  then
    echo "Problems creating user %{_project_user}. Exiting."
    exit -1
  fi
fi

# -------------------------------------------------------------------------------------------- #
# post-install section:
# -------------------------------------------------------------------------------------------- #
%post
echo "[INFO] Configuring application"

    echo "[INFO] Creating log directory"
    mkdir -p %{_log_dir}
    chown -R %{_project_user}:%{_project_user} %{_log_dir}
    chmod -R 755 %{_log_dir}
    setfacl -d -m g::rwx %{_log_dir}
    setfacl -d -m o::rx %{_log_dir}

    echo "[INFO] Create the traces directory"
    mkdir -p %{_localstatedir}/run/%{_project_name} 
    chown -R %{_project_user}:%{_project_user} %{_localstatedir}/run/%{_project_name}


echo "Done"

# -------------------------------------------------------------------------------------------- #
# pre-uninstall section:
# -------------------------------------------------------------------------------------------- #
%preun

if [ "$1" = "0" ]; then
  echo "[INFO] stoping service %{_service_name}"
  service %{_service_name} stop &> /dev/null
fi

# -------------------------------------------------------------------------------------------- #
# post-uninstall section:
# clean section:
# -------------------------------------------------------------------------------------------- #
%postun

if [ "$1" = "0" ]; then
  echo "[INFO] Removing application user"
  userdel -f %{_project_user}

  echo "[INFO] remove uneeded directories"
  rm -rf %{_log_dir} %{_localstatedir}/run/%{_project_name}

fi

%clean
rm -rf $RPM_BUILD_ROOT

# -------------------------------------------------------------------------------------------- #
# Files to add to the RPM 
# -------------------------------------------------------------------------------------------- #
%files
%defattr(755,%{_project_user},%{_project_user},755)
%{_install_dir}
%attr(0744, root, root) /etc/init.d/sth
%attr(0644, root, root) /etc/logrotate.d/logrotate-sth-daily

%changelog

