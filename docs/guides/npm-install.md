# 使用 npm 包安装 DSH Finance

本项目的 npm 包名是 `deepseek-harness-finance-plugin`，公开发布使用 `preview` 预发布标签：

```sh
npm install deepseek-harness-finance-plugin@preview
dsh plugin --profile web add deepseek-harness-finance-plugin@preview
```

第一条把包加入 Node 项目，第二条将包加入 DSH profile 并激活插件。`preview` 不替代 npm 默认的 `latest` 稳定通道，也不代表自动更新或自动兼容未来的 DSH。

## 直接安装已有安装包

已有公开预览版可以直接使用 Release 地址，不需要先手动下载：

```sh
npm install https://github.com/DKKD13/dsh-finance/releases/download/v0.1.0/dsh-research-graph-0.1.0.tgz
dsh plugin --profile web add https://github.com/DKKD13/dsh-finance/releases/download/v0.1.0/dsh-research-graph-0.1.0.tgz
```

第一条用于普通 Node 项目；第二条才是 DSH 插件安装。这个 Release 仍是既有 `v0.1.0`，不包含之后开发候选中的修复。

普通 Node 项目可以这样安装 `.tgz`：

```sh
npm install /absolute/path/to/deepseek-harness-finance-plugin-<version>.tgz
```

这只把包及其依赖加入当前 Node 项目，**不会替 DSH 激活插件**。实际使用 DSH Finance，请将同一个 `.tgz` 安装到 DSH Web profile：

```sh
dsh plugin --profile web add /absolute/path/to/deepseek-harness-finance-plugin-<version>.tgz
```

不需要先解压。`web` 是 DSH 自带的 Web profile 名称；首次使用时，宿主会初始化基础层和 Web 客户端，再加入插件。已有自定义 profile 时，将 `web` 换成你的 profile 名称。

`pnpm` 在安装时可能提示宿主提供的 peer dependencies 未复制到 profile 中。当前宿主已在运行时提供这些模块；不要为了消除提示随意安装另一组不兼容版本。若启动时报缺少模块，应记录实际模块名与宿主版本，不要把它与普通 peer 警告混为一谈。

## 从源码生成并安装

需要 Node.js 22+、npm 和 DSH `>=0.2.1-rc.1 <0.3.0`：

```sh
git clone https://github.com/DKKD13/dsh-finance.git
cd dsh-finance
npm ci
npm run build
PACKAGE=$(npm pack --silent)
dsh plugin --profile web add "$PWD/$PACKAGE"
```

`npm pack --silent` 输出实际 `.tgz` 文件名。使用这个输出而不是反复覆盖同一个版本号，避免 pnpm 或 DSH 继续使用旧缓存。当前开发候选为 `0.1.0-dev.2`；既有 `v0.1.0` 发布包的内容不会被源码中的新版本自动替换。

安装完成后启动或重启对应的 Web profile，在侧栏打开“金融”。模型设置仍由 DSH 管理；插件不附带模型密钥。

## DSH 更新与插件更新

插件与 DSH 的版本独立。当前候选 `0.1.0-dev.2` 实测宿主为 DSH `0.2.1-rc.5`，声明兼容范围为 `>=0.2.1-rc.1 <0.3.0`。插件使用宿主 Cordis、Commands、Session、Remote、Typert 与 UI slot 契约；其中任一不兼容变化都需要重新构建和实际验证。

不要指望 DSH 更新后旧插件自动兼容，也不要把 `@preview` 当作自动更新。升级前备份实际数据目录，在隔离 profile 中先验证目标 DSH 与插件组合，核对激活、真实会话、历史资料、图谱、基金与错误恢复，再替换日常版本。DSH `0.3.x` 不在当前兼容范围内。

## 验证范围

上述 `dsh plugin add` 命令已在隔离的全新 Web profile 中执行，随后实际启动并打开 Finance。安装过程中的外部模块加载、旧版本缓存和 Remote 激活问题已分别修复。验证记录不包含模型研究质量、持续后台计划或所有旧会话恢复的通过结论。
