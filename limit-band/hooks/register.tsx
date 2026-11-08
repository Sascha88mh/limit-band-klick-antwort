import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'limit-band', key: 'limits' } as const, [] as Limit[])

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const BALKEN_BREITE = 180 // CSS-Pixel, Obergrenze
const BALKEN_MIN = 70 // CSS-Pixel, Untergrenze
const BALKEN_HOEHE = 6
const GRAFIK_HOEHE = 20 // Zeilenhöhe, damit der Balken auf der Textachse sitzt

// Schätzwerte für die Platzberechnung auf dem Desktop (CSS-Pixel).
const PX_PRO_SPALTE = 9 // eine Zeichenspalte aus `bodyColumns` (aus Screenshots kalibriert)
const RAND_PX = 32 // Innenabstand je Seite (paddingX="xl")
const LABEL_SPALTEN = 6 // feste Breite für „Tag“/„Woche“ in Zeichenspalten (Box misst in Spalten, nicht Pixeln)
const TEXT_PX = 210 // Beschriftung, Prozent, Reset-Zeit und Abstände einer Gruppe
const LUECKE_PX = 60 // Mindestlücke zwischen „Tag“ und „Woche“

// Claude-Farbwelt: Terracotta als Akzent, warme Grautöne für Flächen.
const PALETTE = {
  hell: { akzent: '#D97757', warn: '#C2410C', track: '#8A8782' },
  dunkel: { akzent: '#D97757', warn: '#F0876A', track: '#8A8782' },
} as const

const zwei = (n: number) => String(n).padStart(2, '0')

function resetText(iso: string | undefined, mitTag: boolean): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const zeit = `${zwei(d.getHours())}:${zwei(d.getMinutes())}`
  return mitTag ? `${WOCHENTAGE[d.getDay()]} ${zeit}` : zeit
}

/**
 * Ein ruhiger, abgerundeter Balken, der die volle Breite seines Kastens
 * einnimmt: dezente Spur, Füllung in Claude-Terracotta (ab 90 % kräftiger),
 * dazu ein feiner Strich, wo das Zeitfenster gerade steht.
 */
function balkenSvg(p: number, dunkel: boolean, breite: number = BALKEN_BREITE): string {
  const c = dunkel ? PALETTE.dunkel : PALETTE.hell
  const W = breite
  const H = BALKEN_HOEHE
  const y = Math.round((GRAFIK_HOEHE - H) / 2)
  const fuellung = Math.max(0, Math.min(W, Math.round((p / 100) * W)))
  const farbe = p >= 90 ? c.warn : c.akzent
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${GRAFIK_HOEHE}" viewBox="0 0 ${W} ${GRAFIK_HOEHE}">` +
    `<rect x="0" y="${y}" width="${W}" height="${H}" rx="3" fill="${c.track}" fill-opacity="0.18"/>` +
    (fuellung > 0 ? `<rect x="0" y="${y}" width="${fuellung}" height="${H}" rx="3" fill="${farbe}"/>` : '') +
    `</svg>`
  )
}

/** Für das Terminal: ein Zeichenbalken, jedes Zeichen 2 %. */
function balkenText(p: number): [string, string] {
  const voll = Math.max(0, Math.min(50, Math.round(p / 2)))
  return ['━'.repeat(voll), '─'.repeat(50 - voll)]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await update($, limits, () => usage.rateLimits.map(r => ({ ...r })))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () => e.rateLimits.map(r => ({ ...r })))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const alle = await read($, limits)
    const tag = alle.find(l => l.kind === 'five_hour')
    const woche = alle.find(l => l.kind === 'seven_day')
    const darunter = await next(e)

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      const zeile = (name: string, l: Limit | undefined, mitTag: boolean) => {
        if (!l) return <Text dimColor>{name}: –</Text>
        const [voll, leer] = balkenText(l.percentUsed)
        const reset = resetText(l.resetsAt, mitTag)
        return (
          <Text>
            <Text dimColor>{name} </Text>
            <Text color="claude">{voll}</Text>
            <Text dimColor>{leer}</Text>
            <Text bold> {Math.round(l.percentUsed)} %</Text>
            {reset ? <Text dimColor>  Reset {reset}</Text> : null}
          </Text>
        )
      }
      return (
        <Box flexDirection="column">
          {tag || woche ? (
            <Box flexDirection="column">
              {zeile('Tag  ', tag, false)}
              {zeile('Woche', woche, true)}
            </Box>
          ) : (
            <Text dimColor>Limits: noch keine Daten – erscheint nach der ersten Antwort</Text>
          )}
          {darunter}
        </Box>
      )
    }

    const { Box, Text, Svg } = $.ui.resolve(e)
    const themeRow = (await $.config.list()).find(row => row.key === 'theme')
    const dunkel = String(themeRow?.value ?? '').toLowerCase().includes('dark')

    // Responsiv: Die Breite des Bandes kommt in Zeichenspalten; daraus wird die
    // Balkenbreite abgeleitet. Reicht der Platz nicht für beide Gruppen in einer
    // Zeile, stehen „Tag“ und „Woche“ untereinander.
    const verfuegbar = Math.max(0, (e.props.bodyColumns || 0) * PX_PRO_SPALTE - 2 * RAND_PX)
    const einzeilig = verfuegbar >= 2 * TEXT_PX + LUECKE_PX + 2 * BALKEN_MIN
    const balkenBreite = einzeilig
      ? Math.round(Math.min(BALKEN_BREITE, Math.max(BALKEN_MIN, (verfuegbar - 2 * TEXT_PX - LUECKE_PX) / 2)))
      : Math.round(Math.min(BALKEN_BREITE, Math.max(BALKEN_MIN, verfuegbar - TEXT_PX)))

    const gruppe = (name: string, l: Limit | undefined, mitTag: boolean) => {
      if (!l) {
        return (
          <Box flexDirection="row" alignItems="center" gap="sm" flexShrink={0}>
            <Text color="subtle">{name}</Text>
            <Text color="inactive">noch keine Daten</Text>
          </Box>
        )
      }
      const reset = resetText(l.resetsAt, mitTag)
      const prozent = Math.round(l.percentUsed)
      const alt = `${name}: ${prozent} % verbraucht${reset ? `, Reset ${reset}` : ''}`
      return (
        <Box flexDirection="row" alignItems="center" gap="sm" flexShrink={0}>
          <Box minWidth={LABEL_SPALTEN}>
            <Text color="subtle">{name}</Text>
          </Box>
          <Svg
            source={balkenSvg(l.percentUsed, dunkel, balkenBreite)}
            alt={alt}
            width={balkenBreite}
            height={GRAFIK_HOEHE}
          />
          <Text bold wrap="truncate-end">{`${prozent} %`}</Text>
          {reset ? <Text color="inactive" wrap="truncate-end">{`· ${reset.replace(' ', ' ')}`}</Text> : null}
        </Box>
      )
    }

    const zeile =
      tag || woche ? (
        einzeilig ? (
          <Box flexDirection="row" alignItems="center" justifyContent="center" gap="xl" paddingX="xl" paddingTop="sm">
            {gruppe('Tag', tag, false)}
            {gruppe('Woche', woche, true)}
          </Box>
        ) : (
          // Innere Spalte hält beide Zeilen linksbündig zueinander, die äußere zentriert den Block.
          <Box flexDirection="column" alignItems="center" paddingX="lg" paddingTop="sm">
            <Box flexDirection="column" gap="xs">
              {gruppe('Tag', tag, false)}
              {gruppe('Woche', woche, true)}
            </Box>
          </Box>
        )
      ) : (
        <Text color="inactive">Limits erscheinen nach der ersten Antwort</Text>
      )

    if (!darunter) return zeile

    return (
      <Box flexDirection="column" gap="sm">
        {zeile}
        {darunter}
      </Box>
    )
  })
}
