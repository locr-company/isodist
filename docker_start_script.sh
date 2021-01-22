#!/bin/bash

nohup ./third_party/osrm-backend/build/osrm-routed data/osrm/bremen.osrm > osrm.log &
nohup ./third_party/valhalla/build/valhalla_service data/valhalla/valhalla.json 1 > valhalla.log &
npm run start
