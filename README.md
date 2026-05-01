# Elternzeugnis

Eine tabletfreundliche Web-App, mit der Kinder ein liebevolles, humorvolles und paedagogisch sinnvolles Zeugnis fuer Eltern oder andere Bezugspersonen erstellen koennen.

## Idee

Kinder sollen nicht einfach „bewerten“, sondern ausdruecken koennen, was ihnen gut tut und was sie sich wuenschen. Die App verbindet spielerische Schulnoten mit positiven Formulierungen, Freitextfeldern und paedagogischen Hinweisen bei schwierigen Bewertungen.

## Funktionen

- Zeugnis-Editor fuer Tablet, Desktop und Smartphone
- Bewertungsbereiche wie Geduld, Zuhoeren, Spielzeit, Fairness und Lernhilfe
- Paedagogische Hinweise bei Note 5 oder 6
- Zeugnisvorschau im druckbaren Format
- Drucken oder als PDF speichern ueber den Browser
- Lokale Speicherung im Browser, keine Serveruebertragung
- Rechtsseiten fuer Impressum, Datenschutz und Cookiehinweise
- Footer mit GitHub-Link und automatischer Versions-/Revisionsanzeige

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Die App laeuft danach lokal unter der im Terminal angezeigten Adresse, standardmaessig:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

Beim Starten und Bauen wird automatisch `src/generated/version.ts` aktualisiert. Die Anzeige im Footer nutzt die Paketversion aus `package.json` und, falls vorhanden, den aktuellen Git-Commit.

## Paedagogische Leitlinien

- Das Kind steht mit seinen Beduerfnissen im Mittelpunkt.
- Eine schlechte Note ist kein Angriff, sondern ein Gespraechsanlass.
- Die App formuliert Verbesserung als Wunsch, nicht als Vorwurf.
- Bei Note 5 oder 6 erscheinen konkrete, kleine und familiennahe Handlungsideen.
- Erst Staerken wahrnehmen, dann einen naechsten Schritt vereinbaren.

## Datenschutz

Die App speichert Eingaben nur lokal im Browser des jeweiligen Geraets. Es werden keine Tracking-Dienste verwendet und keine Zeugnisdaten an einen Server gesendet.

## Repository

GitHub: <https://github.com/Schello805/Elternzeugnis>

## Lizenz

Dieses Projekt ist zur freien nicht-kommerziellen Nutzung verfuegbar. Details stehen in der [LICENSE](LICENSE).
