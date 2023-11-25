const fs = require('fs')
const argsDirs=process.argv.slice(2)
const path = require('path')
const { execSync } = require('child_process');
const allPackages=argsDirs.length?argsDirs.map(dir=>{
  return path.join(process.cwd(),dir)
}):[
  path.join(process.cwd(),'core'), // 核心包
  ...fs.readdirSync(path.join(process.cwd(),'packages','adapters'))
    .map((dir)=>path.join(process.cwd(),'packages','adapters',dir)), // 官方适配器
  ...fs.readdirSync(path.join(process.cwd(),'packages','plugins'))
    .map((dir)=>path.join(process.cwd(),'packages','plugins',dir)) // 官方插件
].filter(root=>{
  return !require(path.join(root,'package.json'))?.private &&
    !!require(path.join(root,'tsconfig.json'))
});
(async ()=>{
  for(const root of allPackages){
    // 创建一个 bundle
    const result=execSync(`rimraf ${root}/lib`,{
      cwd:root,
      encoding:'utf8'
    })
    console.log(result)
  }

})()
