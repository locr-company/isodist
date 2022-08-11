#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
import _ from 'lodash';
import BodyParser from 'body-parser';
import Cors from 'cors';
import Express from 'express';
import { IsoDist, VALID_PROVIDERS } from '../src/index.mjs';
import OSRM from 'osrm';
import Path from 'path';
import Yargs from 'yargs';
import log from '../src/util/log.mjs';

const apiTimeout = 30 * 60 * 1000;

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
	.default('osrm-use-node-binding', false)
	.boolean('osrm-use-node-binding')
	.default('osrm-endpoint', 'http://127.0.0.1:5000/route/v1/') // Devskim: ignore DS137138
	.describe('osrm-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:5000/route/v1/)') // Devskim: ignore DS137138
	.default('valhalla-endpoint', 'http://127.0.0.1:8002/route') // Devskim: ignore DS137138
	.describe('valhalla-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:8002/route)') // Devskim: ignore DS137138
	.argv;

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

app.post('/api/', (req, res) => {
	req.setTimeout(apiTimeout);
	run(req.body)
		.then((data) => {
			res.json(data);
		})
		.catch((err) => {
			log.warn(err);
			res.status(500).send('Something broke!');
		});
});
app.get('/api/', (req, res) => {
	const query = req.query;
	const distances = [];
	if (!query.distances) {
		log.fail('Missing required parameter "distances".');
	}
	const distancesSplitted = query.distances.split(',');
	let distanceCounter = 0;
	for(const distanceSplit of distancesSplitted) {
		distanceCounter++;
		const distance = parseFloat(distanceSplit);
		if (isNaN(distance)) {
			log.fail(`invalid distance[${distanceCounter}] => ${distanceSplit}`);
		}
		distances.push({
			distance: distance
		});
	}
	if (!query.latitude) {
		log.fail('Missing required parameter "latitude".');
	}
	if (!query.longitude) {
		log.fail('Missing required parameter "latitude".');
	}
	const latitude = parseFloat(query.latitude);
	const longitude = parseFloat(query.longitude);
	if (isNaN(latitude)) {
		log.fail(`Invalid "latitude" value => ${query.latitude}`);
	}
	if (isNaN(longitude)) {
		log.fail(`Invalid "longitude" value => ${query.longitude}`);
	}
	let hexSize = 0.5;
	if (query['hex_size']) {
		hexSize = parseFloat(query['hex_size']);
		if (isNaN(hexSize)) {
			log.fail(`Invalid "hex_size" value => ${query['hex_size']}`);
		}
		if (hexSize <= 0) {
			log.fail(`Invalid "hex_size" value => ${hexSize}. It must be greater than 0.`);
		}
	}
	let resolution = 0.2;
	if (query.resolution) {
		resolution = parseFloat(query.resolution);
		if (isNaN(resolution)) {
			log.fail(`Invalid "resolution" value => ${query.resolution}`);
		}
		if (resolution <= 0) {
			log.fail(`Invalid "resolution" value => ${resolution}. It must be greater than 0.`);
		}
	}
	let deintersect = false;
	if (query.deintersect) {
		switch(query.deintersect) {
			case '1':
			case 'true':
			case 'yes':
			case 'on':
				deintersect = true;
				break;
		}
	}
	let noDeburr = false;
	if (query.noDeburr) {
		switch(query.noDeburr) {
			case '1':
			case 'true':
			case 'yes':
			case 'on':
				noDeburr = true;
				break;
		}
	}

	const options = {
		origin: {
			type: 'Point',
			coordinates: [ longitude, latitude ]
		},
		map: query.map || '',
		deintersect: deintersect,
		hexSize: hexSize,
		noDeburr: noDeburr,
		provider: query.provider || 'osrm',
		profile: query.profile || 'car',
		resolution: resolution,
		steps: distances
	};

	run(options)
		.then(data => {
			res.json(data);
		})
		.catch(err => {
			log.warn(err);
			res.status(500).send('Something broke!');
		});
});

const httpPort = process.env.PORT || 3456;

// eslint-disable-next-line no-process-env
app.listen(httpPort, () => {
	log.success(`Isodist server listening on port ${httpPort}!`);
});

// Parse the parameter and call isodist
function run(options) {
	options.data = _.keyBy(options.steps, 'distance');
	options.steps = _.map(options.steps, 'distance');

	let endpoint = '';
	if (options.provider === 'osrm') {
		endpoint = argv['osrm-endpoint'];
	} else if (options.provider === 'valhalla') {
		endpoint = argv['valhalla-endpoint'];
	}

	options = _.defaults(options, {
		deintersect: false,
		endpoint: endpoint,
		hexSize: 0.5,
		profile: 'car',
		provider: 'osrm',
		resolution: 0.2
	});

	if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
		throw new Error(`Invalid provider (${options.provider})`);
	}

	switch(options.provider) {
		case 'osrm':
			if (argv['osrm-use-node-binding']) {
				if (!options.map) {
					log.fail('Missing OSRM map name, if no endpoint is given');
				}
				/**
				 * Resolve the options path
				 */
				const mapName = Path.resolve(__dirname, `../data/osrm/${options.map}.osrm`);
				options.osrm = new OSRM(mapName);
			}
			break;
		
		case 'valhalla':
			if (!options.endpoint) {
				log.fail('Missing endpoint for provider: valhalla');
			}
			break;
	}

	return IsoDist(options.origin, options.steps, options);
}
