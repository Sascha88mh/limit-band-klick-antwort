# limit-band & klick-antwort

Zwei kleine Add-ons (Mods) für Claude Code, gedacht für die Claude-Desktop-App:

- **limit-band** – ein Band über der Eingabezeile, das dauerhaft das Tageslimit
  (5-Stunden-Fenster) und das Wochenlimit als flache Balken mit Prozent und
  Reset-Zeit zeigt. Passt sich der Fensterbreite an.
- **klick-antwort** – Rückfragen von Claude erscheinen als klickbare Knöpfe
  über der Eingabezeile. Ein Klick (oder Taste 1–6) schickt die Antwort ab.
  Dazu bekommt Claude eine Anweisung, Entscheidungsfragen mit wenigen klaren
  Optionen über dieses Tool zu stellen.

Beide laufen auch im Terminal (das Band dann als Zeichenbalken).

## Installation

In einer Terminal-Sitzung von Claude Code, am Prompt:

```
/plugin install limit-band --marketplace Sascha88mh/limit-band-klick-antwort
/plugin install klick-antwort --marketplace Sascha88mh/limit-band-klick-antwort
```

Aus der Shell:

```bash
claude plugin install limit-band --marketplace Sascha88mh/limit-band-klick-antwort
```

```bash
claude plugin install klick-antwort --marketplace Sascha88mh/limit-band-klick-antwort
```

Beim ersten Mal fragt Claude Code `Add marketplace?` – mit `y` bestätigen und
dann den Scope wählen (`user` ist die Voreinstellung).

In der Desktop-App, wo `/plugin` nicht läuft: auf **+** neben dem Eingabefeld
klicken, dann **Plugins**, **Add marketplace** mit
`Sascha88mh/limit-band-klick-antwort`, anschließend **Add plugin**.

## Aufbau

```
.claude-plugin/marketplace.json   Marktplatz-Datei, listet beide Add-ons
limit-band/                       Hooks-Modul, Typen, Test
klick-antwort/                    Hooks-Modul, Typen, Test
```

Prüfen und testen:

```bash
claude plugin validate limit-band
```

```bash
claude plugin test limit-band
```
