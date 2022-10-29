// import pkg from '../../package.json';

export function getCurrentCliVersion() {
  return '0.1.0';
  // TODO: load pkg
  // return pkg.version;
}

export async function getPublishedCliVersion() {
  return getCurrentCliVersion();
  // TODO: バージョン
  // const response = await fetch(`https://registry.npmjs.org/hoge/latest`);
  // const data: { version: string } = await response.json();
  // const latest = data['version'];
  // return latest;
}

const reg = new RegExp(
  '^https://.+.slack.com/archives/([A-Z\\d]+)/p(\\d{16}).*$'
);
export const parseSlackUrl = (
  url: string
): { channel?: string; ts?: string } => {
  console.log('parse target', url);
  const res = reg.exec(url);
  console.log(res);
  if (res && res.length > 2) {
    return {
      channel: res[1],
      ts: `${res[2].slice(0, 10)}.${res[2].slice(10)}`,
    };
  }
  return {};
};
