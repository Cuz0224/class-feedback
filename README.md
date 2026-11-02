# 课后反馈 · dsh-plugin-class-feedback

一个 [DSH（DeepSeek Harness）](https://github.com/deepseek-ai/deepseek-harness) 插件：把腾讯会议纪要和你的课堂观察，写成 **120–220 字、能直接粘给家长** 的课后反馈。

不是"让 AI 夸两句"，而是把一套写作规矩固化成插件：结构、字数、语气、禁用词、正反例都写在代码里，换谁来跑都一样。

---

## 它做了什么

| 能力 | 说明 |
|---|---|
| 侧边栏「课后反馈」tab | 填学生名 + 课上表现，点一下就开一个新对话，内容已经写好 |
| 常驻写作规范 | 你一说"写反馈"，模型必须按规范写，不靠临场提示词 |
| `feedback_guide` | 完整的写作规范（结构 / 长度 / 语气 / 禁用词 / 正反例），按需加载 |
| `feedback_history` | 读某个学生最近几条反馈，用来衔接上次的问题 |
| `feedback_save` | 定稿存档到学生名下 |
| `feedback_students` | 「这周还有谁没写反馈」 |

写作规范的核心要求：必须有一个现场细节（哪道题、卡在哪一步）、一个问题配一个家长今晚就能做的动作、不出现「首先其次」「赋能闭环」「希望继续保持」、全文最多一个感叹号、不带任何 markdown 标记。因为你最终要粘进微信。

## 安装

要求：DSH `0.2.x`（Desktop 或 Web 均可），profile 里有 `plugin_manager`。

**方式 A：直接从 GitHub 装**

```
plugin_manager
  action: install_bundle
  target: github:Cuz0224/class-feedback
```

**方式 B：clone 后按目录装**

```bash
git clone https://github.com/Cuz0224/class-feedback.git
```

```
plugin_manager
  action: install_bundle
  target: /绝对路径/class-feedback
```

装完**刷新一次页面**，侧边栏底部（设置齿轮上方）会出现一个气泡图标。

## 用法

1. 点侧边栏的「课后反馈」
2. 填：学生姓名（必填）、班级、本节课内容、课堂表现 / 要强调的问题、下节课安排
3. 点「生成反馈草稿」—— 会打开一个新对话，输入框里已经写好这段话：

   > 帮我写一条课后反馈。
   > 学生：张小明
   > 班级：初二3班
   > 本节课内容：相似三角形的判定
   > 课堂表现和需要强调的问题：第 5 题把对应边看反了，带着他重标了一遍角……
   > 我可能会附上腾讯会议的会议纪要截图，先读图再写；截图和我上面写的不一致时，以我写的为准。

4. 把**会议纪要截图拖进这个输入框**，回车。文字和截图在一条消息里，模型一次读完就写
5. 输出是纯文本，直接复制发微信

草稿不会自动发送 —— 留着给你贴截图、改措辞。

也可以不用 tab，直接在对话里说"给小明写课后反馈"。

## 数据在哪

```
~/.dsh/class-feedback/records.jsonl
```

一行一条，纯文本，能备份、能 grep、能直接改。改位置：在 profile 的 `cordis.patch.yml` 里给这一行加配置——

```yaml
- id: class-feedback
  name: dsh-plugin-class-feedback
  config:
    dataDir: /your/path
```

## 改写作规范

规范是 [index.js](./index.js) 里的 `GUIDE` 常量。改完重新 `install_bundle` 一次即可（同一路径，先 `remove_bundle` 再装）。

想让它更严厉 / 更温和 / 更短，改这一处就够，不用碰别的地方。

## 卸载

```
plugin_manager
  action: remove_bundle
  target: dsh-plugin-class-feedback
```

## 已知限制

- 截图识别依赖你配的模型是否支持图像输入
- tab 是起草台，不展示历史数据；历史由模型通过工具读取
- 改 Host 代码（`index.js`）后需要重装；改 Client 代码（`client.js`）后需要刷新页面

## English

A DSH plugin that turns Tencent-Meeting minutes and a teacher's class notes into short, natural post-class feedback that a parent can read in 30 seconds — and paste straight into WeChat.

It ships a fixed writing contract (structure, 120–220 characters, banned corporate phrasing, a concrete detail requirement, no markdown), four tools backed by a per-student JSONL record, and a sidebar tab that pre-fills a new conversation.

Install with `plugin_manager` → `install_bundle` → `github:Cuz0224/class-feedback`, then refresh the page.

## License

MIT
