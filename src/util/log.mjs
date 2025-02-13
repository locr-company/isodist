/**
 * log.mjs
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
import Log from './single-line-log.mjs'
import chalk from 'chalk'

const write = Log(process.stderr)

export default function log (data) {
  write(`${chalk.bold.cyan(' .. ')} ${data}`)
}

log.success = function (data) {
  write(`${chalk.bold.green(' OK ')} ${data}`)
  console.error('')
}

log.warn = function (data) {
  write(`${chalk.bold.yellow('WARN')} ${data}`)
  console.error('')
}

log.fail = function (data) {
  write(`${chalk.bold.red('FAIL')} ${data}`)
  console.error('')
}
