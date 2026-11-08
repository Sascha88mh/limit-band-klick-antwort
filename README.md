# limit-band & klick-antwort

Zwei kleine Add-ons (Mods) für Claude Code, gedacht für die Claude-Desktop-App:

- **limit-band** – ein Band über der Eingabezeile, das dauerhaft das Tageslimit
  (5-Stunden-Fenster) und das Wochenlimit als flache Balken mit Prozent und
  Reset-Zeit zeigt. Passt sich der Fensterbreite an.
- **klick-antwort** – Rückfragen von Claude erscheinen als klickbare Knöpfe
  über der Eingabezeile. Ein Klick (oder Taste 1–6) schickt die Antwort ab.
  Dazu bekommt Claude eine Anweisung, Entscheidungsfragen mit wenigen klaren
  Optionen über dieses Tool zu stellen. In der Desktop-App landen auch die
  Abschlussfragen am Ende eines Zugs (die „Next step“-Box) dort, sofern alle
  Knöpfe reine Antworten sind; App-Aktionen wie Commit bleiben in der App-Box.
  Außerdem kann Claude in derselben Box
  - eine **Checkliste** mit Aufgaben zeigen, die du selbst erledigen musst:
    Punkte anklicken zum Abhaken, sind alle erledigt, meldet „Erledigt – weiter“
    Claude mit einem festen Satz, dass alles abgehakt ist;
  - ein **Eingabefeld** für einen einzelnen Wert zeigen (E-Mail-Adresse, Name,
    URL …), abgeschickt mit Enter oder „Senden“. Felder, die nach Passwort,
    Schlüssel, Token, PIN, IBAN oder Kartendaten klingen, lehnt das Add-on ab.

  Knopf-Texte stammen von Claude und werden beim Klick in deinem Namen gesendet.
  Darum sind sie auf eine Zeile mit höchstens 80 Zeichen begrenzt.
  Die Box schließt sich, sobald du antwortest, auch wenn du unten selbst tippst.

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
