const { getPackages } = require('./common');
const { execSync } = require('child_process');
const { gt, prerelease } = require('semver')
const latest = require('latest-version')

function getVersion(name, isNext) {
  if (isNext) {
    return latest(name, { version: 'next' }).catch(() => getVersion(name))
  } else {
    return latest(name).catch(() => '0.0.0')
  }
}

function isNext(version) {
  const parts = prerelease(version)
  if (!parts) return false
  return parts[0] !== 'rc'
}
(async ()=>{
  for(const root of getPackages()){
    const meta=require(root+'/package.json')
    const current = await getVersion(meta.name, isNext(meta.version)) // 获取最新版本号
    if (gt(meta.version, current)) {
      console.log(`start publish ${meta.name}@${meta.version}`)
      execSync(`npm publish --access public --tag ${isNext(meta.version) ? 'next' : 'latest'}`,{
        cwd:root,
        encoding:'utf8'
      })
    }else {
      console.log(`${meta.name}@${meta.version} no change, skip`)
    }
  }
})()

