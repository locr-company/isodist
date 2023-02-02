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
import { IsoDist, DEFAULT_PROVIDER, VALID_PROVIDERS } from '../src/index.mjs';
import Yargs from 'yargs';
import log from '../src/util/log.mjs';

const apiTimeout = 30 * 60 * 1000;

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
	.describe('osrm-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:5000/route/v1/)') // Devskim: ignore DS137138	
	.default('osrm-endpoint', 'http://127.0.0.1:5000/route/v1/') // Devskim: ignore DS137138
	.describe('valhalla-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:8002/route)') // Devskim: ignore DS137138
	.default('valhalla-endpoint', 'http://127.0.0.1:8002/route') // Devskim: ignore DS137138
	.argv;

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

function sendBadRequest(err, res) {
	log.fail(err);

	let message = '';
	if (err instanceof Error) {
		message = err.message;
	} else {
		message = err;
	}

	const jsonResult = {
		code: 400,
		status: 'Bad Request',
		message
	};
	res.status(400);
	res.header('Content-Type', 'application/json');
	res.json(jsonResult);
}
function sendInternalServerError(err, res) {
	log.warn(err);

	let message = '';
	if (err instanceof Error) {
		message = err.message;
	} else {
		message = err;
	}
	const jsonResult = {
		code: 500,
		status: 'Internal Server Error',
		message
	};
	res.status(500);
	res.header('Content-Type', 'application/json');
	res.json(jsonResult);
}

app.post('/api/', (req, res) => {
	req.setTimeout(apiTimeout);
	run(req.body)
		.then(data => res.json(data))
		.catch(err => sendInternalServerError(err, res));
});
app.get('/api/', (req, res) => {
	const query = req.query;
	const distances = [];
	if (!query.distances) {
		return sendBadRequest('Missing required parameter "distances".', res);
	}
	const distancesSplitted = query.distances.split(',');
	let distanceCounter = 0;
	for(const distanceSplit of distancesSplitted) {
		distanceCounter++;
		const distance = parseFloat(distanceSplit);
		if (isNaN(distance)) {
			return sendBadRequest(`invalid distance[${distanceCounter}] => ${distanceSplit}`, res);
		}
		distances.push({
			distance: distance
		});
	}
	if (!query.latitude) {
		return sendBadRequest('Missing required parameter "latitude".', res);
	}
	if (!query.longitude) {
		return sendBadRequest('Missing required parameter "latitude".', res);
	}
	const latitude = parseFloat(query.latitude);
	const longitude = parseFloat(query.longitude);
	if (isNaN(latitude)) {
		return sendBadRequest(`Invalid "latitude" value => ${query.latitude}`, res);
	}
	if (isNaN(longitude)) {
		return sendBadRequest(`Invalid "longitude" value => ${query.longitude}`, res);
	}
	let hexSize = 0.5;
	if (query.hex_size) {
		hexSize = parseFloat(query.hex_size);
		if (isNaN(hexSize)) {
			return sendBadRequest(`Invalid "hex_size" value => ${query.hex_size}`, res);
		}
		if (hexSize <= 0) {
			return sendBadRequest(`Invalid "hex_size" value => ${hexSize}. It must be greater than 0.`, res);
		}
	}
	let resolution = 0.2;
	if (query.resolution) {
		resolution = parseFloat(query.resolution);
		if (isNaN(resolution)) {
			return sendBadRequest(`Invalid "resolution" value => ${query.resolution}`, res);
		}
		if (resolution <= 0) {
			return sendBadRequest(`Invalid "resolution" value => ${resolution}. It must be greater than 0.`, res);
		}
	}
	let deintersect = false;
	if (typeof query.deintersect === 'string') {
		switch(query.deintersect) {
			case '':
			case '1':
			case 'true':
			case 'yes':
			case 'on':
				deintersect = true;
				break;
		}
	}
	let noDeburr = false;
	if (typeof query.no_deburr === 'string') {
		switch(query.no_deburr) {
			case '':
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
		deintersect: deintersect,
		hexSize: hexSize,
		noDeburr: noDeburr,
		provider: query.provider || DEFAULT_PROVIDER,
		profile: query.profile || 'car',
		resolution: resolution,
		steps: distances
	};

	run(options)
		.then(data => res.json(data))
		.catch(err => sendInternalServerError(err, res));
});

const httpPort = process.env.PORT || 3456;

// eslint-disable-next-line no-process-env
app.listen(httpPort, () => {
	log.success(`Isodist server listening on port ${httpPort}!`);
});

// Parse the parameter and call isodist
function run(options) {
	options.data = _.keyBy(options.distances, 'distance');
	options.distances = _.map(options.distances, 'distance');

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
		provider: DEFAULT_PROVIDER,
		resolution: 0.2
	});

	if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
		throw new Error(`Invalid provider (${options.provider})`);
	}

	return IsoDist(options.origin, options.distances, options);
}
