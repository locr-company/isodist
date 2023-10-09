/**
 * cdist.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
import _ from 'lodash';
import log from './util/log.mjs';
import http from 'http';

function routeOSRM(coordinates, options) {
	return new Promise((resolve, reject) => {
		const profiles = ['car', 'bicycle', 'foo'];
		if (profiles.indexOf(options.profile) === -1) {
			return reject(new Error(`Invalid profile: ${options.profile}`));
		}
		const profile = options.profile;

		if (!(coordinates instanceof Array)) {
			return reject(new Error('Coordinates is not an array.'));
		}
		if (coordinates.length < 2) {
			return reject(new Error(`Not enough coordinates where given (${coordinates.length}). Expected at least 2.`));
		}
		const origin = coordinates[0];
		const destination = coordinates[coordinates.length - 1];

		if (typeof origin[0] !== 'number' || typeof origin[1] !== 'number') {
			return reject(new Error('origin coordinate is not a number array.'));
		}
		if (typeof destination[0] !== 'number' || typeof destination[1] !== 'number') {
			return reject(new Error('destination coordinate is not a number array.'));
		}

		const originLatitude = origin[0];
		const originLongitude = origin[1].toString();
		const destinationLatitude = destination[0];
		const destinationLongitude = destination[1];
		if (originLatitude > 90 || originLatitude < -90) {
			return reject(new Error(`Origin latitude (${originLatitude}) is out of range.`));
		}
		// don't ask! github's security scanner wants it that way!???
		if (!originLongitude.match(/^-?\d{1,3}(\.\d+)?$/)) {
			return reject(new Error(`Origin longitude (${originLongitude}) is out of range.`));
		}
		if (destinationLatitude > 90 || destinationLatitude < -90) {
			return reject(new Error(`Destination latitude (${destinationLatitude}) is out of range.`));
		}
		if (destinationLongitude > 540 || destinationLongitude < -540) {
			return reject(new Error(`Destination longitude (${destinationLongitude}) is out of range.`));
		}

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

		// Devskim: ignore DS137138
		const url = `http://127.0.0.1:5000/route/v1/${profile}/${originLongitude},${originLatitude};${destinationLongitude},${destinationLatitude}`;
		http.get(url, restCallback).on('error', reject);
	});
}

function routeValhalla(coordinates, _options) {
	return new Promise((resolve, reject) => {
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
		const requestOptions = {
			method: 'POST'
		};
		// Devskim: ignore DS137138
		const url = 'http://127.0.0.1:8002/route';
		const req = http.request(url, requestOptions, restCallback);
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

		try {
			let result;
			switch(options.provider) {
				case 'osrm':
					result = await routeOSRM(coordinates, options);
					break;
				
				case 'valhalla':
					result = await routeValhalla(coordinates, options);
					break;
			}
			feature.properties.distance = (result && result.routes.length > 0) ? result.routes[0].distance * 0.001 : Number.MAX_VALUE;
		} catch (error) {
			console.log(error);
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
