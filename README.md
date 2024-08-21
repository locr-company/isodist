![GitHub](https://img.shields.io/github/license/locr-company/isodist)
![github_tag](https://img.shields.io/github/v/tag/locr-company/isodist)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=locr-company_isodist&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=locr-company_isodist)

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
git clone https://github.com/locr-company/isodist.git
cd isodist
```

Download and install [Valhalla](https://github.com/valhalla/valhalla) or [OSRM](https://github.com/Project-OSRM/osrm-backend) to use the appropriate provider!

### 1.2. Build podman image, create and start container

#### 1.2.1. For production

If you want to provide date information for the data used by osrm/valhalla via the API (`/api/status?provider=<provider>`):

```bash
export OSRM_DATA_DATE=2024-02-15
export VALHALLA_DATA_DATE=2024-03-01
```

```bash
./scripts/install_service.sh
```

#### 1.2.2. For development

```bash
podman build --tag=isodist-dev --build-arg environment=dev .
podman run --rm -it -v ${PWD}:/app --network=host --name=isodist-dev isodist-dev /bin/bash
npm install
npm start
```

### 1.3. Add nginx config (optional)

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

## 2. Using the API

The default provider is "valhalla" on endpoint: "http://127.0.0.1:8002/route".  
The distance unit is kilometers.  

### 2.1. Use the REST-API

Go to http://localhost:3456/ to visit the demo website.  
You can view the API documentation at https://locr-company.github.io/isodist/ or a local version at http://localhost:3456/api-doc/.

```bash
curl "http://localhost:3456/api/?latitude=52.276406&longitude=10.5346&distances=1,3,5" | jq
```

### 2.2. Use the CLI-API

Via parameters

```bash
./bin/isodist.mjs --lon=10.5346 --lat=52.276406 -d 1 -d 3 -d 5 | jq
```

Via input.json file

You can specify all the parameters in an input file that is piped into standard input:

```json
/* input.json */
{
  "origin": {
    "type": "Point",
    "coordinates": [ 10.5346, 52.276406 ]
  },
  "distances": [{
      "distance": 2
  }, {
      "distance": 5
  }, {
      "distance": 7
  }]
}
```

```sh
$ ./bin/isodist.mjs < input.json
```


## Command Line Arguments

### `--lat`
**Required**.

Latitude of the origin point.

### `--lon`
**Required**.

Longitude of the origin point.

### `-d, --distance`
**Required**.

Distance at which to compute isodistance polygons.
For example, to compute isodistance polygons at 1, 2, 5 and 10 kilometers, use
`--distance 1 --distance 2 --distance 5 --distance 10`

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
