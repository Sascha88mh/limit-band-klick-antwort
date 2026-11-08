export type Rueckfrage = { frage: string; optionen: string[] }

declare module 'claude-code' {
  interface PluginState {
    'klick-antwort': { offen: Rueckfrage | null }
  }
}
