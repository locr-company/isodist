/**
 * cdist.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
import _ from 'lodash';
import log from './util/log.mjs';
import http from 'http';
import https from 'https';

function routeOSRM(option, options) {
	return new Promise((resolve, reject) => {
		const coordinates = option.coordinates;
		const routeOptions = {
			coordinates: [
				[ coordinates[0][1], coordinates[0][0] ],
				[ coordinates[1][1], coordinates[1][0] ]
			]
		};

		const url = `${options.endpoint}${options.profile}/${coordinates[0][1]},${coordinates[0][0]};${coordinates[1][1]},${coordinates[1][0]}`;
		const restCallback = res => {
			const { statusCode } = res;
			const contentType = res.headers['content-type'];
			let error;

			if (statusCode !== 200) {
				error = new Error(`invalid statusCode(${statusCode}) from server.`);
			}
			if (!contentType.match(/application\/json/)) {
				error = new Error(`invalid contentType(${contentType}) from server.`);
			}
			if (error) {
				res.resume();
				return reject(error);
			}

			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', chunk => rawData += chunk);
			res.on('end', () => {
				try {
					const parsedData = JSON.parse(rawData);
					return resolve(parsedData);
				} catch(e) {
					return reject(e);
				}
			});
		};
		if (url.indexOf('https') === 0) {
			https.get(url, restCallback).on('error', reject);
		} else {
			http.get(url, restCallback).on('error', reject);
		}
	});
}

function routeValhalla(option, options) {
	return new Promise((resolve, reject) => {
		const coordinates = option.coordinates;

		const url = options.endpoint;
		const postData = {
			locations: [{
				lat: coordinates[0][0],
				lon: coordinates[0][1],
				type: 'break'
			}, {
				lat: coordinates[1][0],
				lon: coordinates[1][1],
				type: 'break'
			}],
			costing: 'auto',
			directions_options: {
				units: 'kilometers',
				format: 'osrm'
			}
		};
		
		const restCallback = res => {
			const { statusCode } = res;
			const contentType = res.headers['content-type'];
			let error;

			if (statusCode !== 200) {
				error = new Error(`invalid statusCode(${statusCode}) from server.`);
			}
			if (!contentType.match(/application\/json/)) {
				error = new Error(`invalid contentType(${contentType}) from server.`);
			}
			if (error) {
				res.resume();
				return reject(error);
			}

			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', chunk => rawData += chunk);
			res.on('end', () => {
				try {
					const parsedData = JSON.parse(rawData);
					return resolve(parsedData);
				} catch(e) {
					return reject(e);
				}
			});
		};
		const postOptions = {
			method: 'POST'
		};
		let req;
		if (url.indexOf('https') === 0) {
			req = https.request(url, postOptions, restCallback);
		} else {
			req = http.request(url, postOptions, restCallback);
		}
		req.on('error', reject);
		req.write(JSON.stringify(postData));
		req.end();
	});
}

/**
 * Generates distance from origin to each point
 *
 * @param	{Object}	origin	GeoJSON point representing the origin
 * @param	{Object}	pgrid	GeoJSON FeatureCollection of points
 * @param	{Object}	options 
 * @return {Object}	pgrid with distance metrics assigned
 */
export default async function cdist(origin, pgrid, options) {
	/**
	 * Default option values
	 */
	const chunkOptions = {
		chunkSize: 1000,
		delay: 0
	};

	/**
	 * Separate into chunks
	 */
	const chunks = _.chunk(pgrid.features, chunkOptions.chunkSize);

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
			let result;
			switch(options.provider) {
				case 'osrm':
					result = await routeOSRM(option, options);
					break;
				
				case 'valhalla':
					result = await routeValhalla(option, options);
					break;
			}
			feature.properties.distance = (result && result.routes.length > 0) ? result.routes[0].distance * 0.001 : Number.MAX_VALUE;
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
