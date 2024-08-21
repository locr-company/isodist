/**
 * bbox.mjs
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
import * as turf from '@turf/turf'
import log from './util/log.mjs'

/**
 * @desc   Generates the bounding rectangle given an origin point and radius in kilometers
 * @param  {Point}     center   GeoJSON point representing the center of the bounding box
 * @param  {Number}    radius   Radius of the bounding box, in kilometers
 * @return {Number[]}           Turf.js bounding box
 */
export default function bbox (center, radius) {
  log('Computing bounding box...')

  const turfCenter = turf.point(center.coordinates)
  const fc = turf.featureCollection([
    turf.destination(turfCenter, radius, 0),
    turf.destination(turfCenter, radius, 90),
    turf.destination(turfCenter, radius, 180),
    turf.destination(turfCenter, radius, 270)
  ])
  log.success('Computing bounding box')
  return turf.bbox(fc)
}
