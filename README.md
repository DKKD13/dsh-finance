<p align="center"><img src="docs/banner.svg" alt="DSH Finance — 从一份材料，到一个有依据的判断" width="100%"></p>

<p align="center">
  <strong>你的研究工作台，也是一间 AI 投研办公室。</strong><br>
  A local-first finance research workspace for DeepSeek Harness.
</p>

<p align="center">
  <a href="#开始使用">开始使用</a> · <a href="#看看它能做什么">功能实图</a> · <a href="docs/guides/daily-use.md">日常研究</a> · <a href="docs/capabilities.md">能力与数据来源</a>
</p>

DSH Finance 把市场、研究 Skills、资料、观点和模拟基金放进同一个 DeepSeek Harness 工作台。选一个研究任务，带着材料进入对话；读结论时，随时回到原文，继续追问。

这是 **0.1.0 预览版**，适用于桌面 Web Client。第三方插件，与 DeepSeek 官方无隶属关系。

## 看看它能做什么

### 一间有分工的 AI 投研办公室

为虚拟基金创建基金经理、行业研究员与复盘角色。每个工位都有自己的头像、研究风格、任务和覆盖标的；点开工位，可以查看最近研究并继续对话。工作动态集中展示研究产物，持仓、现金和净值由统一的纸面账本计算。

![虚拟基金的研究工位与工作动态](docs/screenshots/research-office.jpg)

同一张纸面账本保存历史净值。曲线可悬停或用方向键查看每个已保存的截面，研究讨论与组合记录可以一起回顾。

![模拟基金的净值历史与截面查看](docs/screenshots/fund-history.jpg)

### 从一个 Skill，进入一场研究

公司研究、财报前瞻、深度研究、估值、每日简报、假说论证，以及不同人物的思考视角，都有对应入口。卡片悬停查看说明，点击选择研究上下文，再进入原生 DSH 对话。包内包含 38 个可注册 Skills。

![研究工作流与 Skills 卡片](docs/screenshots/workflows.jpg)

### 资料不是附件堆，是判断的起点

在同一个资料库里阅读材料、AI 摘要、原文高亮和关联观点。材料、洞见和研究记录分组展示；原始链接与来源时间保留在旁边，方便核对。支持网页剪藏，以及 PDF、DOCX、Markdown 等文件导入。

![资料库中的摘要、原文与关联研究](docs/screenshots/evidence-library.jpg)

### 看行情，也把问题带进研究

个股页包含价格图表、时间区间、比较、历史数据及研究入口。Yahoo 报价与历史行情通过显式请求读取；财务、持有人、预期等栏目展示已导入资料。图表与历史数据支持 PNG / CSV 导出。

![个股图表与公司研究界面](docs/screenshots/stock-research.jpg)

### 把看多与看空的理由放到一起

在多空观点中对照判断、证据与反证；研究报告保留 Markdown，已有报告可以继续讨论。DCF、可比公司和组合计算使用明确输入，预测到期后再结算，让研究留下可回顾的记录。

![多空观点与证据阅读](docs/screenshots/viewpoints.jpg)

> 以上为实际插件组件的截图，使用隔离的公开材料与合成示例数据。它们展示界面及数据结构，不代表实时市场、真实投资业绩或已运行的后台研究。

## 开始使用

需要已安装的 **DeepSeek Harness `>=0.2.1-rc.1 <0.3.0`**，以及可用的模型配置。插件复用 Harness 的模型和原生对话，不附带模型密钥。

1. 从 [Releases](https://github.com/DKKD13/dsh-finance/releases) 下载 `dsh-research-graph-0.1.0.tgz` 并解压到一个固定目录。
2. 在 DSH 对话中，请插件管理器安装这个目录：

   ```text
   请使用 plugin_manager 的 install_bundle，安装以下本地目录：
   <你解压后的 package 目录绝对路径>
   ```

3. 插件激活后，打开侧栏的 **金融**。
4. 到 **工作流** 选择“公司研究”或“每日研究简报”，输入问题，选择已有或新建对话，检查草稿后发送。

首次使用也可以从右上菜单的指南开始。网页剪藏扩展单独提供在 Release 的 `dsh-local-clipper.zip`；它是本地扩展包，尚未在扩展商店上架，配置说明见 [Clipper README](clipper-extension/README.md)。

## 研究资料保存在本地

图谱默认写入 `~/.dsh-research-graph/graph.json`，可在插件配置中修改。材料、关系、修订历史和模拟基金共用这份数据，不需要额外部署数据库。

“本地保存”不意味着离线推理：进入 DSH 对话后，选中的资料可能发送到你配置的模型服务；抓取外部资料也会访问对应来源。

### 可选配置

```yaml
- insert:
    - id: dsh-research-graph
      name: dsh-research-graph
      config:
        autoIndexSkills: true
        writeMirror: false
        historyLimit: 256
```

SEC 需要配置 `secContact`；OpenBB 和 AlphaSift 需要你已有相应服务或 CLI。商业数据库连接器不随包提供。完整能力说明见 [能力与数据来源](docs/capabilities.md)。

## 本地开发

```bash
npm ci
npm run typecheck
npx vitest run --maxWorkers=1 --minWorkers=1
node --test "tests/skills/*.test.mjs"
npm run build
```

无模型配置也可以查看隔离的示例工作台：

```bash
node scripts/preview-server.mjs 48941
node scripts/seed-showcase.mjs http://127.0.0.1:48941
```

打开 `http://127.0.0.1:48941/scripts/preview.html?lang=zh&theme=light&panel=finance-workbench`。预览仅用于 UI 和本地服务演示，不提供原生对话或真实外部行情；关闭服务后，临时图谱清除。

## 当前边界

- 虚拟基金是纸面模拟，不连接券商，也不执行真实交易。
- 持续覆盖依赖实际创建成功的 DSH 计划任务；关闭插件页面不等于配置好了后台研究。
- 财务表、预期、持有人、财报日历和预测市场依赖已导入字段，尚未统一接入实时供应商。
- 行情可用性受公开来源和网络限制；价格提醒在浏览器前台检查。

## 许可证与来源

插件代码采用 [MIT](LICENSE)。随包研究 Skills 与参考方法保留各自的许可证和归属，详见 [Third-Party Notices](THIRD_PARTY_NOTICES.md)。人物视角是基于公开资料的研究方法，不代表本人或其机构背书。用于研究与模拟，不构成投资建议。
