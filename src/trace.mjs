/**
 * trace.mjs
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
import _ from 'lodash'
import log from './util/log.mjs'
import round from './util/round.mjs'
import * as turf from '@turf/turf'

export default function trace (pgrid, d, opts, origin) {
  /**
   * Filter out points not within step range
   */
  log(`Filtering d=${d}...`)
  const filtered = turf.featureCollection(pgrid.features.filter(i => i.properties.distance <= d))

  /**
   * Compute concave hull
   */
  log(`Tracing d=${d}...`)
  const delta = opts.hexSize > 0 ? opts.hexSize : 0.5
  let hull = turf.concave(filtered, { maxEdge: delta, unit: 'kilometers' })
  const boundingCircle = turf.circle(origin, d, { units: 'kilometers' })
  hull = turf.intersect(turf.featureCollection([hull, boundingCircle]))
  hull.properties.distance = d

  /**
   * Skip hex-fitting if hex-size is 0
   */
  if (opts.hexSize <= 0) {
    log.success(`Processing d=${d}`)
    return hull
  }

  /**
   * Generate the appropriate bounding box and hex-grid
   */
  const featureCollection = turf.featureCollection([hull])
  const box = turf.bbox(featureCollection)
  const grid = turf.hexGrid(box, opts.hexSize, { units: 'kilometers', mask: hull })
  const total = grid.features.length

  /**
   * Map-reduce into a single fitted polygon
   */
  const polygon = _
    .chain(grid.features)
    .filter((cell, i) => {
      log(`Fitting d=${d}: ${(i / total * 100).toFixed(2)}%`)
      return turf.intersect(turf.featureCollection([cell, hull]))
    })
    .map(round)
    .reduce((mem, cell, i) => {
      log(`Merging d=${d}: ${(i / total * 100).toFixed(2)}%`)
      return turf.union(turf.featureCollection([mem, cell]))
    })
    .assign({ properties: hull.properties })
    .value()

  log.success(`Processing d=${d}`)
  return polygon
}
