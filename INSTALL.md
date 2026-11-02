# 安装与使用

照着做就行。全部操作都在 DSH 里完成，不需要命令行。

---

## 前提

- DSH `0.2.x`（Desktop 或 Web 都行），profile 里带 `plugin_manager`
- 这台机器能访问 GitHub

## 三步装好

### 1. 在会话里说一句话

随便开一个会话，把下面这句发给 agent：

> 帮我安装插件：github:Cuz0224/class-feedback

agent 会调用 `plugin_manager` 的 `install_bundle`。想自己手动来也行：

```
action: install_bundle
target: github:Cuz0224/class-feedback
```

返回里出现 `"application": "applied"`，就说明装上了。

### 2. 刷新页面

`⌘R`（Windows 是 `Ctrl+R`）。

这一步不能省：Host 那半（工具和写作规范）装完立刻生效，但侧边栏图标属于浏览器侧，要刷新才会加载。

### 3. 看侧边栏

左侧栏底部、设置齿轮上方，会多出一个气泡图标，名字是「课后反馈」。

## 怎么用

点图标 → 填表（学生姓名必填，其余选填）→ 点「生成反馈草稿」→ 跳到新对话，输入框里已经写好一段话 → **把会议纪要截图拖进去，回车**。

也可以完全不开图标，直接在对话里说：

- 「给小雨写课后反馈，今天讲二次函数图象平移，她口诀背下来了但画图不肯先标顶点」
- 「这周还有谁没写反馈」
- 「把小明近三次的反馈找出来我看看」

## 确认真的装好了

从易到难三种查法：

1. 设置 → 插件，列表里有 `dsh-plugin-class-feedback`
2. 侧边栏有图标，点进去是表单而不是白屏
3. 在对话里问「这周还有谁没写反馈」，能正常返回就说明工具被调到了

## 装不上怎么办

| 现象 | 原因 | 处理 |
|---|---|---|
| 卡在下载不动 | git 不读系统代理 | `git config --global http.proxy http://127.0.0.1:端口`，或改用下面的本地安装 |
| 提示 `already-installed` | 之前装过 | 先 `remove_bundle`，再装 |
| 装完没图标 | 没刷新 | `⌘R` |
| 有图标但点开白屏 | Client 模块报错 | 看开发者工具 Console，把报错发回仓库 issue |

### 备用安装方式（网络不通时最稳）

```bash
git clone https://github.com/Cuz0224/class-feedback.git
```

```
action: install_bundle
target: /克隆下来的/class-feedback
```

## 三件该知道的事

1. **数据在各自机器上。** 反馈记录存在 `~/.dsh/class-feedback/records.jsonl`，纯文本，不上传，不跨设备同步。
2. **它是 profile 级的。** 装一次，这台机器上所有会话都能用。
3. **想改写作风格，得 fork。** 从 GitHub 装的是只读副本，改 `GUIDE` 要 clone 下来改完再从本地目录装。

## 安全

第三方插件是跑在 DSH 进程里的代码，装之前值得看一眼。

这个插件的 `index.js` 只 `import` 了 `node:fs` / `node:path` / `node:os`，只读写本地那个 JSONL，**没有任何网络请求**。可以自己扫一眼确认。

## 卸载

```
action: remove_bundle
target: dsh-plugin-class-feedback
```
