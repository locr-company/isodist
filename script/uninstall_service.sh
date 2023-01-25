#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR}

if [ -z ${ISODIST_NAME} ]; then
    ISODIST_NAME=isodist
fi

systemctl --user stop container-${ISODIST_NAME}
systemctl --user disable container-${ISODIST_NAME}
rm ~/.config/systemd/user/container-${ISODIST_NAME}.service
podman image rm -f ${ISODIST_NAME}