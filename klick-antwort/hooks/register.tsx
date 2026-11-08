import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Aufgaben, Eingabe, Offen, Rueckfrage } from '../types'

const offen = atom({ plugin: 'klick-antwort', key: 'offen' } as const, null as Offen | null)
const entwurf = atom({ plugin: 'klick-antwort', key: 'entwurf' } as const, '')

const TOOL = 'mcp__klick-antwort__rueckfrage'
const AUFGABEN = 'mcp__klick-antwort__aufgaben'
const EINGABE = 'mcp__klick-antwort__eingabe'
const WRAP_UP = 'mcp__ccd_turn__wrap_up'

const WARTEN =
  'Beende deinen Zug ohne weiteren Text außer höchstens einem kurzen Satz; die Antwort der Person kommt als nächste Nachricht.'

const ANLEITUNG = `# Rückfragen, Aufgaben und Eingaben über die Klick-Box
Über der Eingabezeile gibt es eine Box, in der die Person mit einem Klick antwortet. Nutze sie über drei Werkzeuge, jeweils höchstens eines pro Zug. Nach dem Aufruf beendest du deinen Zug sofort und wartest: Die Antwort kommt als nächste Nachricht der Person.
- ${TOOL}: Wenn du eine Entscheidung oder Auswahl brauchst und die Antwort aus wenigen klaren Möglichkeiten besteht (frage + 2 bis 6 kurze Optionen, empfohlene zuerst). Stell solche Fragen nicht nur als Text.
- ${AUFGABEN}: Wenn die Person selbst etwas tun muss, bevor es weitergeht, etwa einen Account anlegen, eine Einstellung ändern, eine Datei hochladen oder etwas im Browser bestätigen (titel + 1 bis 8 Stichpunkte, je ein konkreter Schritt in ganz kurzer, einfacher Sprache, in der richtigen Reihenfolge). Die Person hakt die Punkte ab und schickt „Erledigt“; dann weißt du, dass alles getan ist.
- ${EINGABE}: Wenn du einen einzelnen Wert von der Person brauchst, etwa eine E-Mail-Adresse, einen Namen, eine URL oder eine Zahl (frage + feld als kurze Bezeichnung + optional platzhalter als Beispiel). Frag damit nie nach Passwörtern, API-Schlüsseln, Tokens, Kartennummern oder anderen Geheimnissen.
Bei offenen Fragen, die eine längere freie Antwort verlangen, frag normal im Text.`

const ERLEDIGT = 'Erledigt: Ich habe alle Punkte der Checkliste abgehakt.'

// Felder, die nach Zugangsdaten oder Zahlungsdaten klingen, lehnt das Add-on selbst ab.
const GEHEIM =
  /pass(wort|word|phrase)|kennwort|\bpin\b|\btan\b|token|api[\s_-]?key|schl(ü|ue)ssel|secret|geheim|credential|zugangsdaten|\biban\b|kredit\s?karte|karten\s?nummer|card\s?number|\bcvc\b|\bcvv\b|sicherheitscode|2fa|einmalcode|otp\b/i

/** Feldbezeichnung als eine kurze Zeile. */
const kurz = (v: string) => v.replace(/\s+/g, ' ').trim().slice(0, 40)

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
/** Eine Zeile, höchstens `n` Zeichen: Knopf-Texte werden beim Klick in deinem Namen gesendet. */
const zeile = (v: string, n: number) => {
  const t = v.replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
const liste = (v: unknown, max: number) =>
  Array.isArray(v)
    ? v.filter((o): o is string => typeof o === 'string' && o.trim() !== '').map(o => zeile(o, 80)).slice(0, max)
    : []

const istFrage = (o: Offen): o is Rueckfrage => o.art === undefined || o.art === 'frage'

async function schliessen($: EngineInterface) {
  if ((await read($, offen)) !== null) await update($, offen, () => null)
  if ((await read($, entwurf)) !== '') await update($, entwurf, () => '')
}

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
    await $.tool.register({
      name: 'aufgaben',
      description:
        'Zeigt der Person eine Checkliste mit Aufgaben, die sie selbst erledigen muss. Sie hakt jeden Punkt ab und schickt dann „Erledigt“. Danach den Zug beenden; die Bestätigung kommt als nächste Nachricht.',
      inputSchema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Worum es geht, in wenigen Wörtern.' },
          punkte: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 8,
            description: 'Die Schritte in Reihenfolge, je ein ganz kurzer, einfacher Stichpunkt.',
          },
        },
        required: ['titel', 'punkte'],
      },
      isDeferred: false,
    })
    await $.tool.register({
      name: 'eingabe',
      description:
        'Zeigt der Person ein Eingabefeld für einen einzelnen Wert (E-Mail-Adresse, Name, URL, Zahl …). Nie für Passwörter, Schlüssel oder andere Geheimnisse. Danach den Zug beenden; der Wert kommt als nächste Nachricht.',
      inputSchema: {
        type: 'object',
        properties: {
          frage: { type: 'string', description: 'Was du brauchst und wofür, in einem kurzen Satz.' },
          feld: { type: 'string', description: 'Kurze Bezeichnung des Werts, z. B. „E-Mail-Adresse“.' },
          platzhalter: { type: 'string', description: 'Optionales Beispiel, das grau im leeren Feld steht.' },
        },
        required: ['frage', 'feld'],
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
    const frage = text(input.frage)
    const optionen = liste(input.optionen, 6)
    if (!frage || optionen.length < 2) {
      return { deny: 'Bitte eine Frage und mindestens zwei Optionen angeben.' }
    }
    await update($, offen, () => ({ art: 'frage' as const, frage, optionen }))
    return { result: `Die Rückfrage wird der Person jetzt als Knöpfe angezeigt. ${WARTEN}` }
  })

  on('tool.call', { tool: AUFGABEN }, async ($, e) => {
    const input = e as unknown as { titel?: unknown; punkte?: unknown }
    const titel = text(input.titel)
    const punkte = liste(input.punkte, 8)
    if (!titel || punkte.length === 0) {
      return { deny: 'Bitte einen Titel und mindestens einen Stichpunkt angeben.' }
    }
    await update($, offen, () => ({ art: 'aufgaben' as const, titel, punkte, erledigt: punkte.map(() => false) }))
    return { result: `Die Checkliste wird der Person jetzt angezeigt. ${WARTEN}` }
  })

  on('tool.call', { tool: EINGABE }, async ($, e) => {
    const input = e as unknown as { frage?: unknown; feld?: unknown; platzhalter?: unknown }
    const frage = text(input.frage)
    const feld = text(input.feld)
    const platzhalter = text(input.platzhalter)
    if (!frage || !feld) {
      return { deny: 'Bitte eine Frage und eine Feldbezeichnung angeben.' }
    }
    if (GEHEIM.test(`${frage} ${feld} ${platzhalter}`)) {
      return {
        deny: 'Das Eingabefeld ist nicht für Passwörter, Schlüssel, Tokens, PINs, Bank- oder Kartendaten da. Bitte die Person, so etwas selbst an der richtigen Stelle einzutragen, nicht im Chat.',
      }
    }
    await update($, entwurf, () => '')
    await update($, offen, () => ({ art: 'eingabe' as const, frage, feld, ...(platzhalter ? { platzhalter } : {}) }))
    return { result: `Das Eingabefeld wird der Person jetzt angezeigt. ${WARTEN}` }
  })

  // Die Abschlussfrage der Desktop-App (Next-Step-Box) in die eigene Fragebox umleiten.
  // Nur wenn jeder Knopf eine reine Antwort ist: App-Aktionen (commit, create_pr …) kann
  // nur die App selbst ausführen, die bleiben dort.
  on('tool.call', { tool: WRAP_UP }, async ($, e, next) => {
    const { ask, actions, ...rest } = e as unknown as {
      ask?: unknown
      actions?: unknown
      [k: string]: unknown
    }
    const frage = text(ask)
    const knoepfe = Array.isArray(actions) ? actions : []
    const antworten = knoepfe
      .map(k => (k && typeof k === 'object' ? (k as { label?: unknown; action?: unknown }) : {}))
      .filter(k => !k.action && typeof k.label === 'string' && k.label.trim() !== '')
      .map(k => zeile(String(k.label), 80))

    if (!frage || antworten.length === 0 || antworten.length !== knoepfe.length) return next(e)

    // Steht in diesem Zug schon eine Rückfrage, Checkliste oder Eingabe offen, bleibt sie stehen.
    const schonOffen = (await read($, offen)) !== null
    if (!schonOffen) {
      await update($, offen, () => ({ art: 'frage' as const, frage, optionen: antworten.slice(0, 6) }))
    }
    const r = await next(rest as unknown as typeof e)
    if (r.deny !== undefined) return r
    return {
      ...r,
      context: [
        ...(r.context ?? []),
        schonOffen
          ? 'Über der Eingabezeile ist schon eine Rückfrage, Checkliste oder Eingabe offen; die Frage aus ask wurde deshalb nicht angezeigt. Stell sie nicht im Text.'
          : 'Die Frage aus ask wurde nicht in der App-Box, sondern als Klick-Knöpfe über der Eingabezeile angezeigt. Stell sie nicht noch einmal im Text.',
      ],
    }
  })

  // Eingaben aus der Desktop-App oder über Remote Control lösen kein prompt.submit aus.
  // Darum schließt die Box auch, sobald ein neuer Zug mit einer Nachricht beginnt.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && e.text !== '') await schliessen($)
    return next(e)
  })

  // Sobald die Person selbst etwas schickt (getippt oder geklickt), ist die Box erledigt.
  on('prompt.submit', async ($, e, next) => {
    await schliessen($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, offen)
    if (r === null || e.props.hasSurvey) return next(e)

    const el = $.ui.resolve(e)
    const { Box, Text, Button } = el
    const darunter = await next(e)

    const senden = async (antwort: string) => {
      await update($, offen, () => null)
      await update($, entwurf, () => '')
      await $.prompt.submit({ text: antwort, asUser: true })
    }
    const zu = <Button key="schliessen" label="✕" role="dismiss" onPress={() => update($, offen, () => null)} />

    let inhalt
    if (istFrage(r)) {
      inhalt = (
        <Box flexDirection="column" gap="sm">
          <Text bold>{r.frage}</Text>
          <Box flexDirection="row" flexWrap="wrap" gap="sm">
            {r.optionen.map((o, i) => (
              <Button
                key={`opt-${i}`}
                label={o}
                hotkey={String(i + 1)}
                variant={i === 0 ? 'primary' : undefined}
                onPress={() => senden(o)}
              />
            ))}
            {zu}
          </Box>
          <Text dimColor>Klicken, Taste 1–{r.optionen.length} oder einfach selbst etwas tippen.</Text>
        </Box>
      )
    } else if (r.art === 'aufgaben') {
      const a: Aufgaben = r
      const offenZahl = a.erledigt.filter(x => !x).length
      const umschalten = (i: number) => () =>
        update($, offen, alt =>
          alt && alt.art === 'aufgaben' ? { ...alt, erledigt: alt.erledigt.map((x, j) => (j === i ? !x : x)) } : alt,
        )
      // Fester Satz: Claudes eigener Text wird nicht in deinem Namen abgeschickt.
      const fertig = () => senden(ERLEDIGT)
      inhalt = (
        <Box flexDirection="column" gap="sm">
          <Box flexDirection="row" gap="sm" alignItems="center">
            <Text bold>Für dich zu tun: {a.titel}</Text>
          </Box>
          <Box flexDirection="column" gap="xs">
            {a.punkte.map((p, i) => (
              <Button
                key={`punkt-${i}`}
                label={`${a.erledigt[i] ? '☑' : '☐'}  ${p}`}
                hotkey={i < 9 ? String(i + 1) : undefined}
                plain
                dimColor={a.erledigt[i]}
                onPress={umschalten(i)}
              />
            ))}
          </Box>
          <Box flexDirection="row" flexWrap="wrap" gap="sm" alignItems="center">
            {offenZahl === 0 ? (
              <Button key="erledigt" label="Erledigt – weiter" variant="primary" onPress={fertig} />
            ) : (
              <Text dimColor>
                {offenZahl === 1 ? 'Noch 1 Punkt offen' : `Noch ${offenZahl} Punkte offen`} · Punkte anklicken zum Abhaken
              </Text>
            )}
            {zu}
          </Box>
        </Box>
      )
    } else {
      const f: Eingabe = r
      const wert = await read($, entwurf)
      const abschicken = (v: string) => (v.trim() ? senden(`${kurz(f.feld)}: ${v.trim()}`) : undefined)
      inhalt = (
        <Box flexDirection="column" gap="sm">
          <Text bold>{f.frage}</Text>
          {e.surface !== 'mobile' && 'Input' in el ? (
            <Box flexDirection="row" flexWrap="wrap" gap="sm" alignItems="center">
              <el.Input
                key="feld"
                label={f.feld}
                placeholder={f.platzhalter}
                value={wert}
                submitLabel="senden"
                autoFocus
                onInput={v => update($, entwurf, () => v)}
                onSubmit={v => abschicken(v)}
              />
              {wert.trim() ? (
                <Button key="senden" label="Senden" variant="primary" onPress={() => abschicken(wert)} />
              ) : null}
              {zu}
            </Box>
          ) : (
            <Box flexDirection="row" gap="sm" alignItems="center">
              <Text dimColor>{f.feld}: bitte unten in die Eingabezeile tippen.</Text>
              {zu}
            </Box>
          )}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {/* Der Seitenabstand liegt auf einer inneren Box: an der Wurzel wird er vom Rahmen nicht zuverlässig gezeichnet. */}
        <Box flexDirection="column" gap="sm" paddingX="xl">
          {inhalt}
        </Box>
        {darunter ? <Box marginTop="sm">{darunter}</Box> : null}
      </Box>
    )
  })
}
