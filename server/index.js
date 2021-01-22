#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
const _				= require('lodash');
const BodyParser	= require('body-parser');
const Cors			= require('cors');
const Express		= require('express');
const { IsoDist, VALID_PROVIDERS }	= require('..');
const OSRM			= require('osrm');
const Path			= require('path');
const Yargs			= require('yargs');
const log			= require('../src/util/log');

const apiTimeout = 30 * 60 * 1000;

/**
 * Process CLI arguments
 */
const argv = Yargs
	.default('osrm-use-node-binding', false)
	.boolean('osrm-use-node-binding')
	.default('osrm-endpoint', 'http://127.0.0.1:5000/route/v1/')
	.describe('osrm-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:5000/route/v1/)')
	.default('valhalla-endpoint', 'http://127.0.0.1:8002/route')
	.describe('valhalla-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:8002/route)')
	.argv;

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

app.post('/', (req, res) => {
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
