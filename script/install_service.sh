#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR} && cd ..

if [ -z ${ISODIST_NAME} ]; then
    ISODIST_NAME=isodist
fi

podman build -t ${ISODIST_NAME} .
podman create \
    --network=host \
    --name=${ISODIST_NAME} \
    ${ISODIST_NAME}
podman generate systemd --new --name --files ${ISODIST_NAME}

mkdir -p ~/.config/systemd/user
mv container-${ISODIST_NAME}.service ~/.config/systemd/user
systemctl --user enable container-${ISODIST_NAME}
systemctl --user start container-${ISODIST_NAME}