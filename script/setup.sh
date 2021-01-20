#!/bin/bash
#
# Sets up OSRM backend on MacOS
#

destination=".osrm"
release="v5.23.0"

#
# Skip if already installed
#
if [ -d "$destination" ]; then
    echo "OSRM already installed, skipping"
    exit 0
fi

#
# Install build dependencies
#
sudo apt install -y git cmake libxml2 lua5.3 liblua5.3-0 liblua5.3-dev luajit libboost-all-dev

#
# Clone the OSRM repo
# IMPORTANT: We MUST checkout 5.23 tag or otherwise routing will fail down the road
#
git clone https://github.com/Project-OSRM/osrm-backend.git "$destination"
cd "$destination"
git checkout "$release"
mkdir -p bin
cd bin

#
# Generate CMake config and build the binaries
#
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .

#
# Print out further instructions
#
echo "-------------------------------------------------------------------------------"
echo "Please complete following steps to setup isodistance:"
echo " - Visit https://download.geofabrik.de to download OSM files"
echo " - Place .osm files into osrm directory in package directory"
echo " - $ npm run prepare"
