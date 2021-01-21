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
const _			= require('lodash');
const log		= require('../src/util/log');
const OSRM		= require('osrm');
const Path		= require('path');
const { IsoDist, VALID_PROVIDERS }	= require('..');
const StdIn		= require('../src/util/stdin');
const Yargs		= require('yargs');

/**
 * Process CLI arguments
 */
const argv = Yargs
	.alias('m', 'map')
	.describe('map', 'OSRM file to use for routing')
	.alias('s', 'step')
	.describe('step', 'Distances where to compute isodistance polygons')
	.alias('r', 'resolution')
	.default('r', 0.2)
	.describe('r', 'Sampling resolution of point grid')
	.alias('h', 'hex-size')
	.default('h', 0.5)
	.describe('h', 'Size of hex grid cells')
	.alias('p', 'profile')
	.default('p', 'car')
	.describe('p', 'Routing profile to use (car, motorbike, pedestrian...)')
	.default('provider', 'osrm')
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
		 * Generate separate steps and data entries
		 */
		options.data = _.keyBy(options.steps, 'distance');
		options.steps = _.map(options.steps, 'distance');

		/**
		 * Generate the origin point if not specified
		 */
		if (!options.origin && (!_.isFinite(argv.lat) || !_.isFinite(argv.lon))) {
			log.fail('Could not determine origin location');
		}
		if (argv.lat && argv.lon) {
			options.origin = {
				type: 'Point',
				coordinates: [ argv.lon, argv.lat ]
			};
		}

		/**
		 * Generate steps
		 */
		if (argv.step) {
			options.steps = [].concat(argv.step);
		}
		if (!options.steps || !options.steps.length) {
			log.fail('Could not determine isodistance steps');
		}
		const data = {};
		for(let i = 0; i < options.steps.length; i++) {
			data[options.steps[i]] = { distance: options.steps[i] };
		}

		options.data = data;

		/**
		 * Copy over -h, -r and -m
		 */
		options = _.defaults(options, {
			deintersect: argv.deintersect || false,
			endpoint: argv.endpoint,
			hexSize: argv.h,
			map: argv.m,
			noDeburr: argv.noDeburr || false,
			profile: argv.profile || 'car',
			provider: argv.provider || 'osrm',
			resolution: argv.r
		});

		if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
			log.fail(`Invalid provider (${options.provider})`);
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
					const mapName = Path.resolve(__dirname, `../osrm/${options.map}.osrm`);
					options.osrm = new OSRM(mapName);
				}
				break;
			
			case 'valhalla':
				if (!options.endpoint) {
					log.fail('Missing endpoint for provider: valhalla');
				}
				break;
		}

		/**
		 * Start processing
		 */
		return IsoDist(options.origin, options.steps, options);
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
