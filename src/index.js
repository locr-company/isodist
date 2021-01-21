#!/usr/bin/env node

/**
 * index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint no-loop-func: 1 */
const _		= require('lodash');
const Turf	= require('@turf/turf');
const bbox	= require('./bbox');
const cdist	= require('./cdist');
const log	= require('./util/log');
const trace	= require('./trace');

/**
 * Kink coefficient
 * Resolution is multiplied when kinks are detected
 */
const KINK_COEFF = 2.0;

/**
 * Maximum number of retries before failing
 */
const MAX_RETRIES = 10;

const VALID_PROVIDERS = ['osrm', 'valhalla'];

/**
 * @param {GeoJSON} origin Example: { type: "Point", coordinates: [ 9.86557, 52.3703 ] }
 * @param {number[]} steps 
 * @param {Object} options 
 */
async function IsoDist(origin, steps, options) {
	/**
	 * Determine the bounding box and generate point grid
	 */
	const maxStep = _.max(steps);
	const box = bbox(origin, maxStep);

	/**
	 * Retry on kink
	 */
	let isolines = null;
	let retries = 0;

	/**
	 * Compute distances
	 */
	const pgrid = await cdist(origin, Turf.pointGrid(box, options.resolution), options);

	while (!isolines) {
		if (retries > MAX_RETRIES) {
			log.fail('Could not eliminate kinks in isoline polygons');
		}

		/**
		 * Generate isolines and convert them to polygons
		 */
		try {
			isolines = steps.map(i => trace(pgrid, i, options, origin));
		} catch (x) {
			if (!x.known) {
				throw x;
			}
			options.resolution *= KINK_COEFF;
			log.warn(`increased resolution to ${options.resolution} due to polygon kinks`);
		}

		retries++;
	}

	/**
	 * Post-processing
	 *  - Sort by reverse distance
	 *  - Attach additional data to the feature properties
	 */
	log('Post-processing...');
	const post = _
		.chain(isolines)
		.sortBy(i => -i.properties.distance)
		.forEach(i => {
			const data = options.data[i.properties.distance];
			if (!data) {
				log.warn(`No data found for d=${i.properties.distance}`);
			}
			_.assign(i.properties, data);
		})
		.value();

	/**
	 * Sanity-check the result
	 */
	if (post.length !== steps.length) {
		log.fail(`Expected ${steps.length} polygons but produced ${post.length}`);
	}

	log.success('Complete');

	if (options.deintersect && post.length > 1) {
		for(let i = 0; i < post.length - 1; i++) {
			for(let j = i; j < post.length - 1; j++) {
				const properties = Object.assign({}, post[i].properties);
				post[i] = Turf.union(post[i], post[j + 1]);
				post[i].properties = properties;
			}
		}
		for(let i = 0; i < post.length - 1; i++) {
			post[i] = Turf.difference(post[i], post[i + 1]);
		}
	}

	return Turf.featureCollection(post);
}

module.exports = { IsoDist, VALID_PROVIDERS };
