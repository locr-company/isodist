#!/usr/bin/env node

/**
 * server/index.mjs
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict'

import BodyParser from 'body-parser'
import Cors from 'cors'
import Express from 'express'
import { IsoDist, DEFAULT_PROVIDER, VALID_PROVIDERS } from '../src/index.mjs'
import log from '../src/util/log.mjs'
import os from 'os'

const apiTimeout = 30 * 60 * 1000
let runningTasks = 0
let totalTasks = 0

const app = Express()
app.disable('x-powered-by')
app.use(Cors())
app.use(BodyParser.json())
app.use(Express.static('website'))

function sendBadRequest (err, res) {
  log.fail(err)

  let message = ''
  if (err instanceof Error) {
    message = err.message
  } else {
    message = err
  }

  const jsonResult = {
    code: 400,
    status: 'Bad Request',
    message
  }
  res.status(400)
  res.header('Content-Type', 'application/json')
  res.json(jsonResult)
}
function sendInternalServerError (err, res) {
  log.fail(err)

  let message = ''
  if (err instanceof Error) {
    message = err.message
  } else {
    message = err
  }
  const jsonResult = {
    code: 500,
    status: 'Internal Server Error',
    message
  }
  res.status(500)
  res.header('Content-Type', 'application/json')
  res.json(jsonResult)
}

app.get('/api/providers/list', (_req, res) => {
  const json = {
    providers: VALID_PROVIDERS,
    default: DEFAULT_PROVIDER
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(json))
})
app.get('/api/status', (req, res) => {
  const json = {
    data: {},
    machine: {
      'load-average': os.loadavg()
    },
    service: {
      'running-tasks': runningTasks,
      'total-tasks': totalTasks
    }
  }

  const provider = req.query.provider || DEFAULT_PROVIDER
  if (provider === 'valhalla' && process.env.VALHALLA_DATA_DATE) {
    json.data.date = process.env.VALHALLA_DATA_DATE
  } else if (provider === 'osrm' && process.env.OSRM_DATA_DATE) {
    json.data.date = process.env.OSRM_DATA_DATE
  }

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(json))
})

app.post('/api/', (req, res) => {
  req.setTimeout(apiTimeout)
  run(req.body)
    .then(data => res.json(data))
    .catch(err => sendInternalServerError(err, res))
})
app.get('/api/', (req, res) => {
  const query = req.query
  const distances = []
  if (!query.distances) {
    return sendBadRequest('Missing required parameter "distances".', res)
  }
  if (typeof query.distances !== 'string') {
    return sendBadRequest('Invalid "distances" value. It must be a string.', res)
  }
  const distancesSplitted = query.distances.split(',')
  let distanceCounter = 0
  for (const distanceSplit of distancesSplitted) {
    distanceCounter++
    const distance = parseFloat(distanceSplit)
    if (isNaN(distance)) {
      return sendBadRequest(`invalid distance[${distanceCounter}] => ${distanceSplit}`, res)
    }
    distances.push({
      distance
    })
  }
  if (!query.latitude) {
    return sendBadRequest('Missing required parameter "latitude".', res)
  }
  if (!query.longitude) {
    return sendBadRequest('Missing required parameter "latitude".', res)
  }
  const latitude = parseFloat(query.latitude)
  const longitude = parseFloat(query.longitude)
  if (isNaN(latitude)) {
    return sendBadRequest(`Invalid "latitude" value => ${query.latitude}`, res)
  }
  if (isNaN(longitude)) {
    return sendBadRequest(`Invalid "longitude" value => ${query.longitude}`, res)
  }
  let hexSize = 0.5
  if (query.hex_size) {
    hexSize = parseFloat(query.hex_size)
    if (isNaN(hexSize)) {
      return sendBadRequest(`Invalid "hex_size" value => ${query.hex_size}`, res)
    }
    if (hexSize <= 0) {
      return sendBadRequest(`Invalid "hex_size" value => ${hexSize}. It must be greater than 0.`, res)
    }
  }
  let resolution = 0.2
  if (query.resolution) {
    resolution = parseFloat(query.resolution)
    if (isNaN(resolution)) {
      return sendBadRequest(`Invalid "resolution" value => ${query.resolution}`, res)
    }
    if (resolution <= 0) {
      return sendBadRequest(`Invalid "resolution" value => ${resolution}. It must be greater than 0.`, res)
    }
  }
  let deintersect = false
  if (typeof query.deintersect === 'string') {
    switch (query.deintersect) {
      case '':
      case '1':
      case 'true':
      case 'yes':
      case 'on':
        deintersect = true
        break
    }
  }
  let noDeburr = false
  if (typeof query.no_deburr === 'string') {
    switch (query.no_deburr) {
      case '':
      case '1':
      case 'true':
      case 'yes':
      case 'on':
        noDeburr = true
        break
    }
  }

  const options = {
    origin: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    deintersect,
    hexSize,
    noDeburr,
    provider: query.provider || DEFAULT_PROVIDER,
    profile: query.profile || 'car',
    resolution,
    distances
  }

  run(options)
    .then(data => res.json(data))
    .catch(err => sendInternalServerError(err, res))
})

const httpPort = process.env.PORT || 3456

app.listen(httpPort, () => {
  log.success(`Isodist server listening on port ${httpPort}!`)
})

// Parse the parameter and call isodist
async function run (options) {
  const data = {}
  const distances = []
  if (options.distances instanceof Array) {
    for (const distanceObj of options.distances) {
      if (typeof distanceObj.distance === 'number') {
        data[distanceObj.distance] = distanceObj
        distances.push(distanceObj.distance)
      }
    }
  }
  options.data = data
  options.distances = distances

  options.deintersect = options.deintersect ?? false
  options.hexSize = options.hexSize ?? 0.5
  options.profile = options.profile ?? 'car'
  options.provider = options.provider ?? DEFAULT_PROVIDER
  options.resolution = options.resolution ?? 0.2

  if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
    throw new Error(`Invalid provider (${options.provider})`)
  }

  try {
    runningTasks++
    totalTasks++
    return await IsoDist(options.origin, options.distances, options)
  } finally {
    runningTasks--
  }
}
