import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'limit-band',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, bodyColumns: 120 },
} as const

test('Band zeigt Limits grafisch (Desktop) und als Striche (Terminal)', async ($, on) => {
  const reset = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
  on('session.usage', () => ({
    value: { startedAt: 0, context: {}, rateLimits: [
      { kind: 'five_hour', percentUsed: 20, resetsAt: reset },
      { kind: 'seven_day', percentUsed: 73, resetsAt: reset },
    ] },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.now', () => ({ value: Date.now() }))
  on('config.list', () => ({ value: [] }))
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>unten</Text> })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const d = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = await d.find({ type: 'Svg' })
  expect(svg).toBeDefined()
  expect((await d.find({ type: 'Text', text: /73 %/ }))).toBeDefined()
  await d.unmount()

  // Schmales Fenster: muss ohne Fehler zeichnen, Prozentwert bleibt ungebrochen.
  const schmal = await $.ui.mount({ ...BAND, props: { hasSurvey: false, bodyColumns: 40 }, surface: 'desktop' })
  expect(await schmal.find({ type: 'Svg' })).toBeDefined()
  expect(await schmal.find({ type: 'Text', text: /73 %/ })).toBeDefined()
  await schmal.unmount()

  const t = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await t.find({ type: 'Text', text: /━/ }))).toBeDefined()
  await t.unmount()
})
