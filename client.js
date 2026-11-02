window.__ModuleLoader__.load({
  id: 'dsh-plugin-class-feedback',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'class-feedback.panel'
    const DICT = {
      zh: {
        panel: '课后反馈',
        title: '课后反馈',
        subtitle: '把课堂观察，写成家长能读的一段话',
        name: '学生姓名',
        className: '班级',
        topic: '本节课内容',
        notes: '课堂表现 / 要强调的问题',
        next: '下节课安排',
        action: '生成反馈草稿',
        hint: '点击后会打开一个新对话，内容已经写好。把腾讯会议纪要截图拖进去，回车发送。',
        tip: '写得越具体越好：哪道题、卡在哪一步、你当时怎么讲的。空着也行，那就只靠截图。',
        missing: '先填学生姓名。',
        failed: '打开对话失败：',
        optional: '选填',
      },
      en: {
        panel: 'Class Feedback',
        title: 'Class Feedback',
        subtitle: 'Turn class notes into something a parent can read',
        name: 'Student',
        className: 'Class',
        topic: 'What was taught',
        notes: 'In-class performance / the problem to raise',
        next: 'Next lesson',
        action: 'Draft the feedback',
        hint: 'Opens a new conversation with the message prepared. Attach the meeting-minutes screenshot, then send.',
        tip: 'Be specific: which question, where they got stuck, how you handled it. Empty is fine too.',
        missing: 'Student name is required.',
        failed: 'Could not open the conversation: ',
        optional: 'optional',
      },
    }

    const label = {
      display: 'block',
      fontSize: 12,
      lineHeight: '18px',
      color: 'var(--dsw-alias-label-secondary)',
      marginBottom: 6,
    }

    const field = {
      width: '100%',
      boxSizing: 'border-box',
      padding: '8px 10px',
      fontSize: 13,
      lineHeight: '20px',
      fontFamily: 'inherit',
      color: 'var(--dsw-alias-label-primary)',
      background: 'var(--dsw-alias-bg-base)',
      border: '1px solid var(--dsw-alias-border-l1)',
      borderRadius: 8,
      outline: 'none',
    }

    function Field(props) {
      const common = { style: { ...field, ...props.style } }
      return h('div', { style: { marginBottom: 16 } },
        h('label', { style: label }, props.title, props.optional && props.optionalLabel ? h('span', { style: { opacity: 0.6 } }, ` · ${props.optionalLabel}`) : null),
        props.multiline
          ? h('textarea', {
            ...common,
            rows: 4,
            value: props.value,
            placeholder: props.placeholder,
            onChange: (event) => props.onChange(event.target.value),
          })
          : h('input', {
            ...common,
            type: 'text',
            value: props.value,
            placeholder: props.placeholder,
            onChange: (event) => props.onChange(event.target.value),
          }))
    }

    function buildPrompt(form) {
      const lines = ['帮我写一条课后反馈。']
      lines.push(`学生：${form.name}`)
      if (form.className.trim()) lines.push(`班级：${form.className.trim()}`)
      if (form.topic.trim()) lines.push(`本节课内容：${form.topic.trim()}`)
      if (form.notes.trim()) lines.push(`课堂表现和需要强调的问题：${form.notes.trim()}`)
      if (form.next.trim()) lines.push(`下节课安排：${form.next.trim()}`)
      lines.push('我可能会附上腾讯会议的会议纪要截图，先读图再写；截图和我上面写的不一致时，以我写的为准。')
      return lines.join('\n')
    }

    function Panel(props) {
      const t = props.t
      const [name, setName] = React.useState('')
      const [className, setClassName] = React.useState('')
      const [topic, setTopic] = React.useState('')
      const [notes, setNotes] = React.useState('')
      const [next, setNext] = React.useState('')
      const [error, setError] = React.useState('')

      const ready = name.trim() !== ''

      const submit = () => {
        if (!ready) {
          setError(t('missing'))
          return
        }
        try {
          props.submit(buildPrompt(t, { name: name.trim(), className, topic, notes, next }))
          setError('')
        } catch (failure) {
          setError(t('failed') + String((failure && failure.message) || failure))
        }
      }

      return h('div', {
        style: {
          height: '100%',
          overflowY: 'auto',
          padding: '32px 24px 48px',
          boxSizing: 'border-box',
          color: 'var(--dsw-alias-label-primary)',
        },
      }, h('div', { style: { maxWidth: 620, margin: '0 auto' } },
        h('h1', { style: { margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600 } }, t('title')),
        h('p', { style: { margin: '6px 0 24px', fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('subtitle')),

        h('div', {
          style: {
            padding: 20,
            borderRadius: 12,
            border: '1px solid var(--dsw-alias-border-l1)',
            background: 'var(--dsw-alias-bg-layer-1)',
          },
        },
        h(Field, { title: t('name'), value: name, onChange: setName, placeholder: '例如 张小明' }),
        h(Field, { title: t('className'), value: className, onChange: setClassName, placeholder: '例如 初二3班', optional: true, optionalLabel: t('optional') }),
        h(Field, { title: t('topic'), value: topic, onChange: setTopic, placeholder: '例如 相似三角形的判定', optional: true, optionalLabel: t('optional') }),
        h(Field, {
          title: t('notes'),
          value: notes,
          onChange: setNotes,
          multiline: true,
          placeholder: '例如 第 5 题把对应边看反了，带着他重标了一遍角；做题太急，不肯先找对应',
        }),
        h(Field, { title: t('next'), value: next, onChange: setNext, placeholder: '例如 练判定定理的第二种用法', optional: true, optionalLabel: t('optional') }),

        h('button', {
          type: 'button',
          onClick: submit,
          disabled: !ready,
          style: {
            width: '100%',
            padding: '10px 16px',
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 600,
            fontFamily: 'inherit',
            color: '#FFFFFF',
            background: ready ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-state-idle-primary)',
            border: 'none',
            borderRadius: 8,
            cursor: ready ? 'pointer' : 'not-allowed',
          },
        }, t('action')),

        error ? h('p', { style: { margin: '10px 0 0', fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, error) : null,
        h('p', { style: { margin: '10px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' } }, t('hint'))),

        h('p', { style: { margin: '16px 0 0', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' } }, t('tip'))))
    }

    function PanelIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 20
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      },
      h('path', { d: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V6Z' }),
      h('path', { d: 'M7.5 9h9' }),
      h('path', { d: 'M7.5 12.5h5.5' }))
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICT), 'class-feedback: dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'class-feedback',
          locale: NS,
          inject: () => ({
            t,
            submit: (prompt) => ctx.uiWorkspace.startSession(undefined, {
              prompt,
              whenDraftExists: 'append',
            }),
          }),
        }, Panel))

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'class-feedback',
          order: 20,
          locale: NS,
          label: () => t('panel'),
        }, PanelIcon))
      },
    }
  },
})
