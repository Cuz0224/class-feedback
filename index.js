/**
 * Host half of the class-feedback bundle.
 *
 * Registers one always-on prompt section (the trigger), one on-demand writing
 * guide (the style contract), and three tools that keep a per-student feedback
 * record on disk so the next message can build on the last one.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/* ------------------------------------------------------------------ *
 * Writing contract
 * ------------------------------------------------------------------ */

const GUIDE = `# 课后反馈写作规范

## 一条反馈要达成什么
家长 30 秒读完，知道：今天学了什么、孩子哪里好、哪里要改、今晚做什么。
读完的感觉必须是「这个老师真的在带我家孩子」，不是「系统生成了一份报告」。
反馈是写给家长的，不是写给学生的，也不是给机构存档看的。

## 结构（3–5 句，可自然合并，不要分点）
1. 今天学了什么：具体到知识点或题型，一句，不超过 30 字。
2. 孩子今天的表现：一到两句，必须含一个只有现场才知道的细节——哪道题、哪次回答、哪个动作、卡在哪一步。
3. 一个问题 + 一个可执行动作：问题要具体到能复现，动作要家长今晚就能做（重做哪题、先做什么、多久）。
4. 下节课或作业安排：一句，可选。

## 硬性要求
- 120–220 字。纯文本，不分点、不加小标题、不用 emoji。
- 可直接粘贴进微信：不要出现 **、##、- 这类 markdown 标记，不要引用块。
- 称呼用「XX 妈妈 / XX 爸爸」或「家长您好」；不知道是谁就用「家长您好」。
- 语气是教了十年书的老师：平实、克制、有判断。可以夸，但只夸具体发生的事，不夸「棒」「优秀」「聪明」。
- 不写「首先/其次/最后」「不仅……而且」「总的来说」「值得一提的是」「希望继续保持」。
- 不用这些词：赋能、助力、闭环、抓手、深耕、颗粒度、底层逻辑、认知、维度、场景化、沉浸式。
- 不排比、不押韵、不喊口号；全文感叹号最多一个。
- 不编造。截图和老师口述里没有的信息一律不写；拿不准就不写，不要用「相信」「一定」去补。
- 不复述会议纪要原文。纪要是素材，反馈是结论。

## 反例（不要这样写）
「小明同学今天的表现非常棒！不仅掌握了相似三角形的判定，而且展现了很强的逻辑思维能力。希望继续保持，加油！」
问题：没有细节、空泛表扬、三个感叹号、套话堆砌，家长读完不知道孩子到底卡在哪。

## 正例
「今天讲了相似三角形的判定，主要练找对应边。小明的思路是对的，但第 5 题卡了很久，两条边的对应关系看反了，我带着他重新标了一遍角。这类题他现在的问题是急着算，不先找对应。今晚麻烦让他把讲义第 3 题重做一遍，要求先圈出对应角再动笔，做完拍给我看。下节课练判定定理的第二种用法。」

## 信息不足时
缺少学生姓名、本次课内容或课堂表现中的任何一项，先问一个问题补齐，不要硬写。一次只问一个最关键的问题。`

const SECTION = `## 课后反馈
用户要求写课后反馈（课后点评、给家长的话、学情反馈）时，按顺序执行：
1. 先调用 feedback_guide 读取写作规范，严格按规范写；
2. 再调用 feedback_history 看该学生上一次反馈，避免重复，并在合适时体现前后延续；
3. 用户发来腾讯会议纪要截图时，先读图提取本次课的知识点、作业和课堂记录，再与用户口述结合；两者冲突时以用户口述为准；
4. 写完后调用 feedback_save 存档，并把最终文本原样输出给用户——纯文本，可直接粘贴进微信，不要再包一层解释。`

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

function defaultDataDir() {
  return path.join(os.homedir(), '.dsh', 'class-feedback')
}

function today() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function textBlocks(text) {
  return [{ type: 'text', text }]
}

async function readRecords(file) {
  let raw
  try {
    raw = await fs.readFile(file, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') return []
    throw error
  }
  const records = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') records.push(parsed)
    } catch {
      // A half-written line must not break the whole history.
    }
  }
  return records
}

function daysAgo(dateText, days) {
  const then = Date.parse(`${dateText}T00:00:00`)
  if (Number.isNaN(then)) return false
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return then >= cutoff
}

function byDateDesc(left, right) {
  const byDate = String(right.date ?? '').localeCompare(String(left.date ?? ''))
  if (byDate !== 0) return byDate
  // Two feedbacks on the same day: the later save wins.
  return String(right.savedAt ?? '').localeCompare(String(left.savedAt ?? ''))
}

/* ------------------------------------------------------------------ *
 * Plugin entry
 * ------------------------------------------------------------------ */

export const inject = ['tools', 'systemPrompt']

export function apply(ctx, config = {}) {
  const dataDir = config.dataDir ? String(config.dataDir) : defaultDataDir()
  const recordsFile = path.join(dataDir, 'records.jsonl')

  const load = () => readRecords(recordsFile)

  /** Resolve the student name the teacher meant, tolerating partial input. */
  function resolveStudent(input, records) {
    const wanted = String(input ?? '').trim()
    if (wanted === '') return { name: null, candidates: [] }
    const names = [...new Set(records.map((record) => String(record.student ?? '').trim()).filter(Boolean))]
    if (names.includes(wanted)) return { name: wanted, candidates: [] }
    const partial = names.filter((name) => name.includes(wanted) || wanted.includes(name))
    if (partial.length === 1) return { name: partial[0], candidates: [] }
    return { name: null, candidates: partial.length > 0 ? partial : names }
  }

  const studentNames = (records) =>
    [...new Set(records.map((record) => String(record.student ?? '').trim()).filter(Boolean))]

  /* ---------------------------- tools ---------------------------- */

  ctx.effect(() => ctx.tools.register({
    name: 'feedback_guide',
    description: '课后反馈的写作规范：结构、长度、语气、禁用词与正反例。写任何课后反馈之前先调用它。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: { type: 'object', properties: { guide: { type: 'string' } }, required: ['guide'] },
      render: (_args, value) => textBlocks(String(value && value.guide ? value.guide : '')),
    },
    async execute() {
      return { guide: GUIDE }
    },
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'feedback_students',
    description: '列出已经存档反馈的学生：每人最近一次反馈的日期与主题、近 7 天的条数。用来回答「这周还有谁没写反馈」。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: {
        type: 'object',
        properties: {
          students: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                lastDate: { type: 'string' },
                lastTopic: { type: 'string' },
                recent7: { type: 'number' },
                total: { type: 'number' },
              },
            },
          },
        },
        required: ['students'],
      },
      render: (_args, value) => {
        const students = (value && value.students) || []
        if (students.length === 0) return textBlocks('还没有任何反馈存档。')
        const lines = students.map((student) =>
          `${student.name}｜最近 ${student.lastDate || '无'}｜近7天 ${student.recent7} 条｜共 ${student.total} 条｜${student.lastTopic || '未记主题'}`)
        return textBlocks(lines.join('\n'))
      },
    },
    async execute() {
      const records = await load()
      const students = studentNames(records).map((name) => {
        const own = records.filter((record) => record.student === name).sort(byDateDesc)
        return {
          name,
          lastDate: own[0] ? String(own[0].date ?? '') : '',
          lastTopic: own[0] ? String(own[0].topic ?? '') : '',
          recent7: own.filter((record) => daysAgo(String(record.date ?? ''), 7)).length,
          total: own.length,
        }
      })
      return { students }
    },
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'feedback_history',
    description: '读某个学生最近几条课后反馈原文，用于衔接上一次提到的问题、避免重复措辞。学生姓名可以用简称。',
    parameters: {
      type: 'object',
      properties: {
        student: { type: 'string', description: '学生姓名，可以是老师习惯的简称。' },
        limit: { type: 'number', description: '最多返回几条，默认 3。' },
      },
      required: ['student'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          found: { type: 'boolean' },
          student: { type: 'string' },
          candidates: { type: 'array', items: { type: 'string' } },
          records: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                topic: { type: 'string' },
                text: { type: 'string' },
              },
            },
          },
        },
        required: ['found', 'records'],
      },
      render: (_args, value) => {
        if (!value || !value.found) {
          const candidates = (value && value.candidates) || []
          if (candidates.length === 0) return textBlocks('没有找到这个学生的反馈记录。')
          return textBlocks(`没有精确匹配。已有记录的学生：${candidates.join('、')}`)
        }
        const records = value.records || []
        if (records.length === 0) return textBlocks(`${value.student} 还没有反馈记录。`)
        return textBlocks(records.map((record) => `${record.date}｜${record.topic || '未记主题'}\n${record.text}`).join('\n\n'))
      },
    },
    async execute(args) {
      const input = args && typeof args === 'object' ? args : {}
      const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(20, Math.trunc(input.limit))) : 3
      const records = await load()
      const resolved = resolveStudent(input.student, records)
      if (resolved.name === null) {
        return { found: false, student: String(input.student ?? ''), candidates: resolved.candidates, records: [] }
      }
      const own = records
        .filter((record) => record.student === resolved.name)
        .sort(byDateDesc)
        .slice(0, limit)
        .map((record) => ({
          date: String(record.date ?? ''),
          topic: String(record.topic ?? ''),
          text: String(record.text ?? ''),
        }))
      return { found: true, student: resolved.name, candidates: [], records: own }
    },
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'feedback_save',
    description: '把一条已经写好的课后反馈存档到学生名下。写完反馈后立刻调用，便于下次衔接。',
    parameters: {
      type: 'object',
      properties: {
        student: { type: 'string', description: '学生姓名。' },
        feedback: { type: 'string', description: '最终发给家长的反馈全文，不含任何解释。' },
        topic: { type: 'string', description: '本次课主题，如「相似三角形的判定」。' },
        className: { type: 'string', description: '班级，如「初二3班」。' },
        date: { type: 'string', description: '上课日期 YYYY-MM-DD，默认今天。' },
      },
      required: ['student', 'feedback'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          saved: { type: 'boolean' },
          student: { type: 'string' },
          date: { type: 'string' },
          total: { type: 'number' },
          path: { type: 'string' },
        },
        required: ['saved', 'student'],
      },
      render: (_args, value) => textBlocks(
        value && value.saved
          ? `已存档：${value.student}｜${value.date}｜共 ${value.total} 条`
          : '存档失败。'),
    },
    async execute(args) {
      const input = args && typeof args === 'object' ? args : {}
      const student = String(input.student ?? '').trim()
      const feedback = String(input.feedback ?? '').trim()
      if (student === '' || feedback === '') {
        throw new Error('student 和 feedback 都不能为空')
      }
      const date = String(input.date ?? '').trim() || today()
      const record = {
        date,
        student,
        className: String(input.className ?? '').trim(),
        topic: String(input.topic ?? '').trim(),
        text: feedback,
        savedAt: new Date().toISOString(),
      }
      await fs.mkdir(dataDir, { recursive: true })
      await fs.appendFile(recordsFile, `${JSON.stringify(record)}\n`, 'utf8')
      const records = await load()
      const total = records.filter((item) => item.student === student).length
      return { saved: true, student, date, total, path: recordsFile }
    },
  }))

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'class-feedback',
    order: 700,
    text: SECTION,
  }))
}
