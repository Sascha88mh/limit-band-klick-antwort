/** Rückfrage mit Antwort-Knöpfen. `art` fehlt bei Werten aus älteren Versionen. */
export type Rueckfrage = {
  art?: 'frage'
  frage: string
  optionen: string[]
  /** Mehrfachauswahl: Optionen als Kästchen, abgeschickt mit „Auswahl senden“. */
  mehrfach?: true
  gewaehlt?: boolean[]
}

/** Aufgaben-Checkliste, die die Person abhakt und dann als erledigt abschickt. */
export type Aufgaben = { art: 'aufgaben'; titel: string; punkte: string[]; erledigt: boolean[] }

/** Ein einzelner Wert, den die Person in ein Feld tippt. */
export type Eingabe = { art: 'eingabe'; frage: string; feld: string; platzhalter?: string }

export type Offen = Rueckfrage | Aufgaben | Eingabe

declare module 'claude-code' {
  interface PluginState {
    'klick-antwort': {
      offen: Offen | null
      /** Was gerade im Eingabefeld steht. */
      entwurf: string
    }
  }
}
