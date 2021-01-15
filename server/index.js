#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Hao Chen <a@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
const _				= require('lodash');
const BodyParser	= require('body-parser');
const Cors			= require('cors');
const Express		= require('express');
const IsoDist		= require('..');
const OSRM			= require('osrm');
const Path			= require('path');

const apiTimeout = 30 * 60 * 1000;

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

app.post('/', (req, res) => {
	req.setTimeout(apiTimeout);
	run(req.body)
		.then((data) => {
			res.json(data);
		})
		.catch((err) => {
			// eslint-disable-next-line no-console
			console.log(err);
			res.status(500).send('Something broke!');
		});
});

// eslint-disable-next-line no-process-env
app.listen(process.env.PORT || 3456, () => {
	// eslint-disable-next-line no-console
	console.log('Isodist server listening on port 3456!');
});

// Parse the parameter and call isodist
function run(options) {
	options.data = _.keyBy(options.steps, 'distance');
	options.steps = _.map(options.steps, 'distance');

	options = _.defaults(options, {
		resolution: 0.1,
		hexSize: 0.5,
		deintersect: false
	});

	const mapName = Path.resolve(__dirname, `../osrm/${options.map}.osrm`);
	const osrm = new OSRM(mapName);

	return IsoDist(options.origin, options.steps, options, osrm);
}
