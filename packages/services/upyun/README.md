# @52bot/plugin-upyun
为 52bot 提供又拍云存储服务
## 使用方法
1. 安装插件
```shell
yarn add @52bot/plugin-upyun
```
2. 在`.[mode].env` 文件中配置环境变量
```text
UPDOMAIN = 又拍云绑定域名，不填时自动使用测试域名
UPBUCKET = 又拍云存储桶名
UPOPERATOR = 又拍云操作员名
UPPASSWORD = 又拍云操作员密码
```
3. 在`.[mode].env` 文件中启用又拍云插件
```text
modulePlugins = @52bot/plugin-upyun
```

