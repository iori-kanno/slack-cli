import colors from 'colors/safe';

let isDebug = false;

export function setDebug(enabled?: boolean) {
  isDebug = enabled ?? false;
}

export function error(message: any, ...optionalParams: any[]) {
  console.error(colors.red('error:'), message, optionalParams);
}

export function success(message: any, ...optionalParams: any[]) {
  console.log(
    colors.green('success:'),
    message,
    optionalParams.length === 0 ? '' : optionalParams
  );
}

export function debug(message: any, ...optionalParams: any[]) {
  if (!isDebug) return;
  console.log(
    colors.gray('debug:'),
    message,
    optionalParams.length === 0 ? '' : optionalParams
  );
}

export function created(name: string, ...optionalParams: any[]) {
  console.log(
    'created:',
    colors.green(name),
    optionalParams.length === 0 ? '' : optionalParams
  );
}

export function warn(message: any, ...optionalParams: any[]) {
  console.warn(
    colors.yellow('warn:'),
    message,
    optionalParams.length === 0 ? '' : optionalParams
  );
}
