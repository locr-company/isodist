#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR} && cd ..

if [ -z ${ISODIST_NAME} ]; then
    ISODIST_NAME=isodist
fi

podman build \
    --tag=${ISODIST_NAME} \
    --build-arg environment=prod .

CREATE_CMD="podman create"
if [ ! -z "${VALHALLA_DATA_DATE}" ]; then
    CREATE_CMD="${CREATE_CMD} -e VALHALLA_DATA_DATE=${VALHALLA_DATA_DATE}"
fi
if [ ! -z "${OSRM_DATA_DATE}" ]; then
    CREATE_CMD="${CREATE_CMD} -e OSRM_DATA_DATE=${OSRM_DATA_DATE}"
fi
CREATE_CMD="${CREATE_CMD} --network=host"
CREATE_CMD="${CREATE_CMD} --name=${ISODIST_NAME}"
CREATE_CMD="${CREATE_CMD} ${ISODIST_NAME}"
${CREATE_CMD}
podman generate systemd --new --name --files ${ISODIST_NAME}

mkdir -p ~/.config/systemd/user
mv container-${ISODIST_NAME}.service ~/.config/systemd/user
systemctl --user enable container-${ISODIST_NAME}
systemctl --user start container-${ISODIST_NAME}