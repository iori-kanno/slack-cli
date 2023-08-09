import colors from 'colors/safe';
import { Logger, LogLevel } from '@slack/logger';

let logger: Logger | undefined;
let isDebug = false;

export function setLogger(newLogger: Logger) {
  logger = newLogger;
}

export function setDebug(enabled?: boolean) {
  isDebug = enabled ?? false;
  logger?.setLevel(enabled ? LogLevel.DEBUG : LogLevel.INFO);
  success(`Debug mode is ${enabled ? 'enabled' : 'disabled'}.`);
}

export function error(message: any, ...optionalParams: any[]) {
  if (logger) logger.error(message, optionalParams);
  else console.error(colors.red('error:'), message, optionalParams);
}

export function success(message: any, ...optionalParams: any[]) {
  if (logger) logger.info(message, optionalParams);
  else
    console.log(
      colors.green('success:'),
      message,
      optionalParams.length === 0 ? '' : optionalParams
    );
}

export function debug(message: any, ...optionalParams: any[]) {
  if (logger) logger.debug(message, optionalParams);
  else {
    if (!isDebug) return;
    console.log(
      colors.gray('debug:'),
      message,
      optionalParams.length === 0 ? '' : optionalParams
    );
  }
}

export function warn(message: any, ...optionalParams: any[]) {
  if (logger) logger.warn(message, optionalParams);
  else
    console.warn(
      colors.yellow('warn:'),
      message,
      optionalParams.length === 0 ? '' : optionalParams
    );
}
