#!/usr/bin/env bash

function clean_up_previous_builds() {
	_logStage "Cleaning up previous builds of rpm..."

	rm -rf ${RPM_BASE_DIR}/{RPMS,BUILDROOT,BUILD,SRPMS}
	return 0
}

function usage() {
    SCRIPT=$(basename $0)

    printf "\n" >&2
    printf "usage: ${SCRIPT} [options] \n" >&2
    printf "\n" >&2
    printf "Options:\n" >&2
    printf "\n" >&2
    printf "    -h                    show usage\n" >&2
    printf "    -v VERSION            Mandatory parameter. Version for rpm product preferably in format x.y.z \n" >&2
    printf "    -r RELEASE            Mandatory parameter. Release for product. I.E. 0.ge58dffa \n" >&2
    printf "\n" >&2
    exit 1
}

while getopts ":v:r:u:a:h" opt

do
    case $opt in
        v)
            VERSION_ARG=${OPTARG}
            ;;
        r)
            RELEASE_ARG=${OPTARG}
            ;;
        h)
            usage
            ;;
        *)
            echo "invalid argument: '${OPTARG}'"
            exit 1
            ;;
    esac
done

BASE_DIR="$(cd ${0%/*} && pwd -P)/../.."
RPM_BASE_DIR="${BASE_DIR}/package/rpm"
RPM_SOURCE_DIR="${RPM_BASE_DIR}/SOURCES"
RPM_PRODUCT_SOURCE_DIR="${RPM_SOURCE_DIR}/usr/sth"

# Import the colors for deployment script
source ${BASE_DIR}/package/scripts/colors_shell.sh
[[ $? -ne 0 ]] && echo "ERROR: file ${BASE_DIR}/package/scripts/colors_shell.sh not foud" && exit 1

# _log "BASE_DIR               = ${BASE_DIR}"
# _log "RPM_BASE_DIR           = ${RPM_BASE_DIR}"
# _log "RPM_SOURCE_DIR         = ${RPM_SOURCE_DIR}"
# _log "RPM_PRODUCT_SOURCE_DIR = ${RPM_PRODUCT_SOURCE_DIR}"


if [[ $(id -u) == "0" ]]; then
	_logError "${0}: shouldn't be executed as root"
	exit 1
fi

if [[ ! -z ${VERSION_ARG} ]]; then
	PRODUCT_VERSION=${VERSION_ARG}
else
	_logError "A product version must be specified with -v parameter."
	usage
	exit 2
fi

if [[ ! -z ${RELEASE_ARG} ]]; then
	PRODUCT_RELEASE=${RELEASE_ARG}
else
	_logError "A product reslease must be specified with -r parameter."
	usage
	exit 2
fi

if [[ -d "${RPM_BASE_DIR}" ]]; then

	clean_up_previous_builds 
	[[ $? -ne 0 ]] && _logError "Cannot clean up previous builds." && exit 1

	rm -rf ${RPM_BASE_DIR}/BUILD
	rm -rf ${RPM_BASE_DIR}/BUILDROOT
	for SPEC_FILE in $(find "${RPM_BASE_DIR}" -type f -name *.spec)
	do
		_log "Packaging using: ${SPEC_FILE}... "
		# Execute command to create RPM
		RPM_BUILD_COMMAND="rpmbuild -v -ba ${SPEC_FILE} --define '_topdir '${RPM_BASE_DIR} --define '_product_version '${PRODUCT_VERSION} --define '_product_release '${PRODUCT_RELEASE} "
		_log "Rpm construction command: ${RPM_BUILD_COMMAND}"
		rpmbuild -v -ba ${SPEC_FILE} --define '_topdir '${RPM_BASE_DIR} --define '_product_version '${PRODUCT_VERSION} --define '_product_release '${PRODUCT_RELEASE}
		if [[ $? -ne 0 ]]; then
			_logError "RPM build has failed!" 
			exit 1
		else
			_logStage "RPM build succesfully finished!"
		fi
	done
else
	_logError "${RPM_BASE_DIR} not exists" && exit 1
fi

