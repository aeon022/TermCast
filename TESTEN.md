# ttyreel ausprobieren — Schritt für Schritt

Alles in das Terminal (Kitty) kopieren, mit Enter bestätigen. Zeilen mit `#` sind nur Erklärungen.

## 1. Installieren (einmalig)

```bash
cd ~/Developing/Projects/ttyreel
git pull
npm install --omit=dev
npm install -g .
```

## 2. Prüfen, ob es klappt

```bash
ttyreel --version
ttyreel demo
```

## 3. Der Assistent (empfohlen)

```bash
ttyreel wizard
```

Er fragt dich Schritt für Schritt, zeigt dir den fertigen Befehl zum Merken und führt ihn aus. Enter nimmt jeweils den Vorschlag in den eckigen Klammern; Strg+C bricht ab.

## 4. Ein eigener Befehl

```bash
ttyreel render "ls -la" -o test
```

Die Datei `test.svg` liegt danach im aktuellen Ordner; per Doppelklick im Finder oder mit `open test.svg` ansehen.

## 5. Hilfe

```bash
ttyreel --help
ttyreel <befehl> --help
```

Mehr Rezepte: [TUTORIAL.md](TUTORIAL.md).
