# 远程开发

代码仓库是 DSH Finance 的版本来源。远程机器使用独立 checkout 开发，本机浏览器用于体验；产品数据、模型凭据、验收历史和发布视频不应提交到代码仓库。

## 准备环境

需要 Git、Node.js 22 和 npm。本项目通过 lockfile 安装依赖，构建不会安装或配置 DSH 宿主。

```sh
git clone https://github.com/DKKD13/dsh-finance.git ~/dsh-finance-code
cd ~/dsh-finance-code
npm ci
```

## 验证代码

按顺序执行，限制测试为一个工作进程，避免同时运行构建与测试。

```sh
NODE_OPTIONS=--max-old-space-size=768 npm run typecheck
NODE_OPTIONS=--max-old-space-size=768 npm run build
NODE_OPTIONS=--max-old-space-size=768 npx vitest run --maxWorkers=1 --minWorkers=1
NODE_OPTIONS=--max-old-space-size=768 node --test --test-concurrency=1 "tests/skills/*.test.mjs"
npm pack --dry-run
```

如果机器没有 Chrome，浏览器交互测试可能需要本机浏览器或已有 Chrome 环境。保留失败记录，不得把跳过的浏览器测试写成通过。

## 实际使用

插件需要 DSH `>=0.2.1-rc.1 <0.3.0`。用单独的 DSH profile、工作区和图谱目录安装，先验证普通对话，再验证金融功能。安装步骤和首次使用检查见 [首次试用](first-trial.md)。远程机器应使用 Linux 依赖，不能复制 macOS 的 node_modules 或直接执行旧的本机验收脚本。

模型设置沿用宿主的配置方式，不把凭据写进插件或 Git。开发服务应保持认证，通过自己的 SSH 通道访问。

## 版本与交接

开始开发前记录分支和 commit。每次变更保留问题、修改文件、实际验证和未完成事项。发布包必须由对应 commit 构建，并另行验证全新安装；类型、单元测试和构建通过不代表 AI 研究内容或持续覆盖已通过产品验收。

当前 `v0.1.0` 是预览版，新的分支修复不会自动进入该下载包。
