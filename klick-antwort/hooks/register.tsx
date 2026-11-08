import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Rueckfrage } from '../types'

const offen = atom({ plugin: 'klick-antwort', key: 'offen' } as const, null as Rueckfrage | null)

const TOOL = 'mcp__klick-antwort__rueckfrage'

const ANLEITUNG = `# Rückfragen mit Klick-Antworten
Wenn du eine Entscheidung oder Auswahl der Person brauchst und die Antwort aus wenigen klaren Möglichkeiten besteht, rufe das Tool ${TOOL} auf (frage + 2 bis 6 kurze Optionen, empfohlene Option zuerst), statt die Frage nur als Text zu stellen. Die Person klickt dann einfach eine Antwort an. Nach dem Aufruf beendest du deinen Zug sofort und wartest: Die gewählte Antwort kommt als nächste Nachricht der Person. Pro Zug höchstens eine solche Rückfrage. Bei offenen Fragen, die freien Text verlangen, frag normal im Text.`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'rueckfrage',
      description:
        'Zeigt der Person eine Rückfrage mit 2 bis 6 klickbaren Antwort-Knöpfen über der Eingabezeile. Danach den Zug beenden; die gewählte Antwort kommt als nächste Nachricht.',
      inputSchema: {
        type: 'object',
        properties: {
          frage: { type: 'string', description: 'Die Frage, kurz und eindeutig.' },
          optionen: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 6,
            description: 'Kurze Antworten (je 1 bis 6 Wörter), empfohlene zuerst.',
          },
        },
        required: ['frage', 'optionen'],
      },
      isDeferred: false,
    })
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return {
      sections: [...r.sections, { id: 'klick-antwort:anleitung', text: ANLEITUNG, scope: 'session' as const }],
    }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as { frage?: unknown; optionen?: unknown }
    const frage = typeof input.frage === 'string' ? input.frage.trim() : ''
    const optionen = Array.isArray(input.optionen)
      ? input.optionen.filter((o): o is string => typeof o === 'string' && o.trim() !== '').map(o => o.trim()).slice(0, 6)
      : []

    if (!frage || optionen.length < 2) {
      return { deny: 'Bitte eine Frage und mindestens zwei Optionen angeben.' }
    }

    await update($, offen, () => ({ frage, optionen }))
    return {
      result:
        'Die Rückfrage wird der Person jetzt als Knöpfe angezeigt. Beende deinen Zug ohne weiteren Text außer höchstens einem kurzen Satz; die gewählte Antwort kommt als nächste Nachricht.',
    }
  })

  // Sobald die Person selbst etwas schickt (getippt oder geklickt), ist die Rückfrage erledigt.
  on('prompt.submit', async ($, e, next) => {
    if ((await read($, offen)) !== null) {
      await update($, offen, () => null)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, offen)
    if (r === null || e.props.hasSurvey) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const darunter = await next(e)

    const antworten = (text: string) => async () => {
      await update($, offen, () => null)
      await $.prompt.submit({ text, asUser: true })
    }

    return (
      <Box flexDirection="column">
        {/* Der Seitenabstand liegt auf einer inneren Box: an der Wurzel wird er vom Rahmen nicht zuverlässig gezeichnet. */}
        <Box flexDirection="column" gap="sm" paddingX="xl">
          <Text bold>{r.frage}</Text>
          <Box flexDirection="row" flexWrap="wrap" gap="sm">
            {r.optionen.map((o, i) => (
              <Button
                key={`opt-${i}`}
                label={o}
                hotkey={String(i + 1)}
                variant={i === 0 ? 'primary' : undefined}
                onPress={antworten(o)}
              />
            ))}
            <Button key="schliessen" label="✕" role="dismiss" onPress={() => update($, offen, () => null)} />
          </Box>
          <Text dimColor>Klicken, Taste 1–{r.optionen.length} oder einfach selbst etwas tippen.</Text>
        </Box>
        {darunter ? <Box marginTop="sm">{darunter}</Box> : null}
      </Box>
    )
  })
}
