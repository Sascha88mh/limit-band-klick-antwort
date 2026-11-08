import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'klick-antwort',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, bodyColumns: 80 },
} as const

test('Rückfrage erscheint als Knöpfe, Klick schickt die Antwort', async ($, on) => {
  const gesendet: string[] = []
  on('tool.register', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => { gesendet.push(e.text); return { text: e.text } })
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>unten</Text> })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.tool.call({ tool: 'mcp__klick-antwort__rueckfrage', frage: 'Welche Farbe?', optionen: ['Rot', 'Blau'] })
  expect(r.deny).toBeUndefined()

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Welche Farbe/ }))?.text).toContain('Welche Farbe?')
  await ui.press({ key: 'opt-1' })
  expect(gesendet).toEqual(['Blau'])
  expect(await ui.find({ type: 'Text', text: /Welche Farbe/ })).toBeUndefined()
  await ui.unmount()
})

test('Zu wenige Optionen werden abgelehnt', async ($, on) => {
  on('tool.register', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.tool.call({ tool: 'mcp__klick-antwort__rueckfrage', frage: 'X?', optionen: ['nur eine'] })
  expect(r.deny).toBeDefined()
})
