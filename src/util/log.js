/**
 * log.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
const Log          = require('single-line-log');
const chalk        = require('chalk');

const write        = Log(process.stderr);

function log(data) {
	write(`${chalk.bold.cyan(' .. ')} ${data}`);
}

module.exports = log;

log.success = function(data) {
	write(`${chalk.bold.green(' OK ')} ${data}`);
	// eslint-disable-next-line no-console
	console.error('');
};


log.warn = function(data) {
	write(`${chalk.bold.yellow('WARN')} ${data}`);
	// eslint-disable-next-line no-console
	console.error('');
};


log.fail = function(data) {
	write(`${chalk.bold.red('FAIL')} ${data}`);
	// eslint-disable-next-line no-console
	console.error('');
	const err = new Error(data);
	err.known = true;
	throw err;
};
