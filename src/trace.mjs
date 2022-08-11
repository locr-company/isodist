/**
 * trace.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
import _ from 'lodash';
import log from './util/log.mjs';
import round from './util/round.mjs';
import * as Turf from '@turf/turf';

export default function trace(pgrid, d, opts, origin) {
	/**
	 * Filter out points not within step range
	 */
	log(`Filtering d=${d}...`);
	const filtered = Turf.featureCollection(pgrid.features.filter(i => i.properties.distance <= d));

	/**
	 * Compute concave hull
	 */
	log(`Tracing d=${d}...`);
	const delta = opts.hexSize > 0 ? opts.hexSize : 0.5;
	let hull = Turf.concave(filtered, { maxEdge: delta, unit: 'kilometers' });
	const boundingCircle = Turf.circle(origin, d, { units: 'kilometers' });
	hull = Turf.intersect(hull, boundingCircle);
	hull.properties.distance = d;

	/**
	 * Skip hex-fitting if hex-size is 0
	 */
	if (opts.hexSize <= 0) {
		log.success(`Processing d=${d}`);
		return hull;
	}

	/**
	 * Generate the appropriate bounding box and hex-grid
	 */
	const featureCollection = Turf.featureCollection([hull]);
	const box = Turf.bbox(featureCollection);
	const grid = Turf.hexGrid(box, opts.hexSize, {units: 'kilometers', mask: hull});
	const total = grid.features.length;

	/**
	 * Map-reduce into a single fitted polygon
	 */
	const polygon = _
		.chain(grid.features)
		.filter((cell, i) => {
			log(`Fitting d=${d}: ${(i / total * 100).toFixed(2)}%`);
			return Turf.intersect(cell, hull);
		})
		.map(round)
		.reduce((mem, cell, i) => {
			log(`Merging d=${d}: ${(i / total * 100).toFixed(2)}%`);
			return Turf.union(mem, cell);
		})
		.assign({ properties: hull.properties })
		.value();

	log.success(`Processing d=${d}`);
	return polygon;
}
