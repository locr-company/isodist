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
const log			= require('../src/util/log');

const apiTimeout = 30 * 60 * 1000;

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

	options = _.defaults(options, {
		deintersect: false,
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
			if (options.endpoint) {
				if (options.map) {
					log.fail('Ambigious parameters where given (--endpoint and --map). Please only use 1 of them!');
				}
			} else {
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
