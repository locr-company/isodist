/**
 * bbox.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
import * as Turf from '@turf/turf';
import log from './util/log.mjs';

/**
 * @desc   Generates the bounding rectangle given an origin point and radius in kilometers
 * @param  {Point}     center   GeoJSON point representing the center of the bounding box
 * @param  {Number}    radius   Radius of the bounding box, in kilometers
 * @return {Number[]}           Turf.js bounding box
 */
export default function bbox(center, radius) {
	log('Computing bounding box...');

	const turfCenter = Turf.point(center.coordinates);
	const fc = Turf.featureCollection([
		Turf.destination(turfCenter, radius, 0),
		Turf.destination(turfCenter, radius, 90),
		Turf.destination(turfCenter, radius, 180),
		Turf.destination(turfCenter, radius, 270)
	]);
	log.success('Computing bounding box');
	return Turf.bbox(fc);
}
