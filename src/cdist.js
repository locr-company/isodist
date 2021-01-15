/**
 * cdist.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
const _			= require('lodash');
const log		= require('./util/log');

function routeOSRM(osrm, options) {
	return new Promise((resolve, reject) => {
		if (!options.coordinates) {
			reject();
			return;
		}
		const coordinates = options.coordinates;

		const routeOptions = {
			coordinates: [
				[ coordinates[0][1], coordinates[0][0] ],
				[ coordinates[1][1], coordinates[1][0] ]
			]
		};
		osrm.route(routeOptions, (err, results) => {
			if (err) {
				return reject(err);
			}

			return resolve(results);
		});
	});
}

/**
 * Generates distance from origin to each point
 *
 * @param  {Object} osrm OSRM-class
 * @param  {Object} origin GeoJSON point representing the origin
 * @param  {Object} pgrid GeoJSON FeatureCollection of points
 * @return {Object}       pgrid with distance metrics assigned
 */
async function cdist(osrm, origin, pgrid) {
	/**
	 * Default option values
	 */
	const options = {
		chunkSize: 1000,
		delay: 0
	};

	/**
	 * Separate into chunks
	 */
	const chunks = _.chunk(pgrid.features, options.chunkSize);

	/**
	 * Create the mapping function
	 */
	async function _single(feature) {
		const coordinates = [
			[ origin.coordinates[1], origin.coordinates[0] ],
			[ feature.geometry.coordinates[1], feature.geometry.coordinates[0] ]
		];

		const option = {
			coordinates,
			json: true // Automatically parses the JSON string in the response
		};
		try {
			const result = await routeOSRM(osrm, option);
			feature.properties.distance = result.routes.length > 0 ? result.routes[0].distance * 0.001 : Number.MAX_VALUE;
		} catch (error) {
			// console.log(error);
		}
	}

	/**
	 * Process each chunk
	 */
	for (let i = 0; i < chunks.length; i++) {
		await Promise.all(chunks[i].map(_single));

		log(`Computing distances: ${(i / chunks.length * 100).toFixed(2)}%`);
	}
	log.success('Computing distances');

	return pgrid;
}

module.exports = cdist;
