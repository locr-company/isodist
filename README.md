# ![Header][0]

This package can compute isodistance polygons based on driving distance.  
This repository is originally forked from https://github.com/ricepo/isodist

## 1. IsoDist Service Installation (Ubuntu 22.04)

### 1.1. Prerequisites

If something should differ from the defaults, set the environment variables for the install and update script and add them to `~/.bashrc`!

```bash
export ISODIST_NAME=isodist # optional (default: isodist)
```

Download this repository

```bash
git clone git@github.com:locr-company/isodist.git
cd isodist
```

### 1.2. Build podman image, create and start container

```bash
./scripts/install_service.sh
```

### 1.3. Add nginx config

```bash
sudo cp nginx/isodist /etc/nginx/conf.d
```

ensure, that the following line(s) exists in /etc/nginx/sites-enabled/{server-config}

```nginx
server {
  ...
  include conf.d/isodist;
  ...
}
```

## 2. Old installation description

## Prerequisites for Ubuntu 20.04
```sh
sudo apt install build-essential curl file git libtbb2 libtbb-dev lua5.3 liblua5.3-0 liblua5.3-dev libluabind-dev
```

## Getting Started
```sh
$ git clone git@github.com:locr-company/isodist.git
$ cd isodist
$ git submodule update --init --recursive
$ npm install
```

In order to run `isodist`, you will need to download an `*.osm` file corresponding to the region
where you want to do your computation. [Geofabrik][1] is a good source of these files.

You need to place your OSM files into the `isodist/osrm` directory (create one if it does not exist).
Then run the following command to generate `.osrm` files:
```sh
$ npm run prepare
```

Finally, you are good to go! In order to generate the graph above, you will need `indiana.osrm` and
run the following:
```sh
$ isodist --lon=-86.893386 --lat=40.417202 -s 2 -s 5 -s 7 -r 0.1 -h 0.5 -m indiana
```

## Input file
You can specify all the parameters in an input file that is piped into standard input:
```json
/* input.json */
{
  "origin": {
    "type": "Point",
    "coordinates": [ -86.893386, 40.417202 ]
  },
  "map": "indiana",
  "steps": [{
      "distance": 2
  }, {
      "distance": 5
  }, {
      "distance": 7
  }]
}
```
```sh
$ isodist < input.json
```

Please note that CLI arguments always override values specified in the input file.
```sh
$ isodist --map il < input.json
# The above command will use `osrm/il.osrm`
```


## Command Line Arguments

### `--lat`
**Required**.

Latitude of the origin point.

### `--lon`
**Required**.

Longitude of the origin point.

### `-s, --step`
**Required**.

Distance at which to compute isodistance polygons.
For example, to compute isodistance polygons at 1, 2, 5 and 10 kilometers, use
`--step 1 --step 2 --step 5 --step 10`


### `-m, --map`
**Required**.

Name of the `.osrm` file you wish to use for routing.


### `-r, --resolution`
Optional, default: 0.2

Sampling resolution of the underlying point grid. Larger values will result in less precise
results but much faster processing. Smaller values will produce more precise results, but will
require exponentially more processing time and memory.

Having a very small resolution value may result in kinks (i.e. self-intersections) of isodistance
polygons, which cause hex-fitting to fail. You can choose to ignore them by disabling hex-fitting,
but note that presence of kinks usually indicates incorrect parameter choice.


### `-h, --hex-size`
Optional, default: 0.5

Size of hex grid cells that isodistances are fitted onto. Passing a 0 value will disable
hex grid fitting.


### `--no-deburr`
Optional, default: none

This flag instructs `isodist` not to remove isolated "islands" from isodistance geometries.


[0]: media/isodist.png
[1]: https://download.geofabrik.de
