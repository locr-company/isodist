#!/usr/bin/env node

/**
 * bin/isodist.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 * @example node bin/isodist.js --lon=9.86557 --lat=52.3703 -s 2 -s 5 -s 7 -r 0.1 -h 0.5 -m niedersachsen-latest
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
import _ from 'lodash';
import log from '../src/util/log.mjs';
import Path from 'path';
import { dirname } from 'path';
import { fileURLToPath }  from 'url';
import { IsoDist, DEFAULT_PROVIDER, VALID_PROVIDERS }	from '../src/index.mjs';
import StdIn from '../src/util/stdin.mjs';
import Yargs from 'yargs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
	.alias('d', 'distance')
	.describe('distance', 'Distances where to compute isodistance polygons')
	.alias('r', 'resolution')
	.default('r', 0.2)
	.describe('r', 'Sampling resolution of point grid')
	.alias('h', 'hex-size')
	.default('h', 0.5)
	.describe('h', 'Size of hex grid cells')
	.alias('p', 'profile')
	.default('p', 'car')
	.describe('p', 'Routing profile to use (car, motorbike, pedestrian...)')
	.default('provider', DEFAULT_PROVIDER)
	.describe('provider', 'Routing provider (osrm, valhalla)')
	.describe('endpoint', 'An http-endpoint to the routing provider (e.g.: http://127.0.0.1:5000/route/v1/)')
	.boolean('no-deburr')
	.describe('no-deburr', 'Disable removal of isolated "islands" from isodistance result')
	.boolean('deintersect')
	.describe('deintersect', 'Deintersects all polygons')
	.argv;

/**
 * Read stdin file
 */
StdIn()
	.then(options => {
		/**
		 * Generate separate distances and data entries
		 */
		options.data = _.keyBy(options.distances, 'distance');
		options.distances = _.map(options.distances, 'distance');

		/**
		 * Generate the origin point if not specified
		 */
		if (!options.origin && (!(_.isFinite(argv.lat) && _.isFinite(argv.lon)))) {
			log.fail('Could not determine origin location');
		}
		if (argv.lat && argv.lon) {
			options.origin = {
				type: 'Point',
				coordinates: [ argv.lon, argv.lat ]
			};
		}

		/**
		 * Generate distances
		 */
		if (argv.distance) {
			options.distances = [].concat(argv.distance);
		}
		if (!options.distances?.length) {
			log.fail('Could not determine isodistance distances');
		}
		const data = {};
		for(let i = 0; i < options.distances.length; i++) {
			data[options.distances[i]] = { distance: options.distances[i] };
		}

		options.data = data;

		const provider = argv.provider || DEFAULT_PROVIDER
		let endpoint = '';
		switch (provider) {
			case 'osrm':
				endpoint = 'http://127.0.0.1:5000/route/v1/';
				break;
			case 'valhalla':
				endpoint = 'http://127.0.0.1:8002/route';
				break;
		}

		/**
		 * Copy over -h, -r and -m
		 */
		options = _.defaults(options, {
			deintersect: argv.deintersect,
			endpoint: endpoint,
			hexSize: argv.h,
			noDeburr: argv['no-deburr'],
			profile: argv.profile || 'car',
			provider,
			resolution: argv.r
		});

		if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
			log.fail(`Invalid provider (${options.provider})`);
		}

		/**
		 * Start processing
		 */
		return IsoDist(options.origin, options.distances, options);
	})
	.then(fc => {
		const output = JSON.stringify(fc, null, 2);
		process.stdout.write(output);
		process.exit(0);
	})
	.catch(err => {
		if (!err.known) {
			// eslint-disable-next-line no-console
			console.error(err.stack);
		}
		process.exit(1);
	});
