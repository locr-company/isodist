/**
 * util/stdin.mjs
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
import Bluebird from 'bluebird';

export default function stdin() {
	return new Bluebird(
		(resolve, reject) => {
			const stream = process.stdin;
			const chunks = [];

			if (stream.isTTY) {
				resolve({ });
			}

			stream.setEncoding('utf8');
			stream.on('data', d => chunks.push(d));
			stream.on('end', () => {
				if (chunks.length === 0) {
					resolve({ });
				}
				const input = chunks.join('');
				resolve(JSON.parse(input));
			});

			stream.on('error', e => reject(e));
		}
	);
}
