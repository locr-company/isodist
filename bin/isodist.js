#!/usr/bin/env node

/**
 * bin/isodist.js
 *
 * @author Denis Luchkin-Zhou <denis@ricepo.com>
 * @author Ringo Leese <r.leese@locr.com
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 * @example node bin/isodist.js --lon=9.86557 --lat=52.3703 -s 2 -s 5 -s 7 -r 0.1 -h 0.5 -m niedersachsen-latest
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
const _			= require('lodash');
const log		= require('../src/util/log');
const OSRM		= require('osrm');
const Path		= require('path');
const IsoDist	= require('..');
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
			resolution: argv.r,
			noDeburr: argv.noDeburr,
			hexSize: argv.h,
			map: argv.m,
			deintersect: argv.deintersect
		});

		/**
		 * We really need that map though
		 */
		if (!options.map) {
			log.fail('Missing OSRM map path');
		}

		/**
		 * Resolve the options path
		 */
		const mapName = Path.resolve(__dirname, `../osrm/${options.map}.osrm`);
		const osrm = new OSRM(mapName);

		/**
		 * Start processing
		 */
		return IsoDist(options.origin, options.steps, options, osrm);
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
