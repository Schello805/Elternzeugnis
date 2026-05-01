# Elternzeugnis

Eine tabletfreundliche Web-App, mit der Kinder ein liebevolles, humorvolles und paedagogisch sinnvolles Zeugnis fuer Eltern oder andere Bezugspersonen erstellen koennen.

## Idee

Kinder sollen nicht einfach „bewerten“, sondern ausdruecken koennen, was ihnen gut tut und was sie sich wuenschen. Die App verbindet spielerische Schulnoten mit positiven Formulierungen, Freitextfeldern und paedagogischen Hinweisen bei schwierigen Bewertungen.

## Funktionen

- Zeugnis-Editor fuer Tablet, Desktop und Smartphone
- direkte Eingabe der Noten im Zeugnisdesign
- Stammdaten fuer Kinder, Eltern und Bezugspersonen
- Verlauf ueber gespeicherte Zeugnisse pro Jahr
- grafische Auswertungen mit Durchschnitt und Kategorien
- Bewertungsbereiche wie Geduld, Zuhoeren, Spielzeit, Fairness und Lernhilfe
- Paedagogische Hinweise bei Note 5 oder 6
- Zeugnisvorschau im druckbaren Format
- Drucken oder als PDF speichern ueber den Browser
- Erinnerungssystem mit SMTP-Konfiguration ueber `.env`
- SMTP-Konfiguration und Testmail direkt im lokalen Frontend
- PDF-Export ohne Cloud-Dienst
- mehrere Zeugnisdesigns
- Export und Import der lokalen App-Daten
- Lokale Speicherung im Browser, keine Serveruebertragung
- Footer mit GitHub-Link und automatischer Versions-/Revisionsanzeige

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Die App startet damit Frontend und Reminder-API. Das Frontend laeuft standardmaessig unter:

```text
http://127.0.0.1:5173/
```

Die Reminder-API laeuft lokal unter:

```text
http://127.0.0.1:4174/
```

## Erinnerungen per E-Mail

Erstelle lokal eine `.env` Datei nach dem Muster aus `.env.example`:

```bash
cp .env.example .env
```

Danach SMTP-Daten eintragen:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dein-benutzer
SMTP_PASS=dein-passwort
SMTP_FROM="Elternzeugnis <noreply@example.com>"
```

Erinnerungen werden lokal in `data/reminders.json` gespeichert. Dieser Ordner wird nicht versioniert.

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

## Lokale Daten

Die App ist fuer lokale Nutzung gedacht. Sie speichert Eingaben nur lokal im Browser des jeweiligen Geraets. Es werden keine Tracking-Dienste verwendet und keine Zeugnisdaten an externe Server gesendet.

Fuer E-Mail-Erinnerungen speichert der lokale API-Server Erinnerungsdaten in `data/reminders.json`. SMTP-Zugangsdaten liegen ausschliesslich in der lokalen `.env` Datei. Die SMTP-Konfiguration kann ueber die lokale Oberflaeche gepflegt werden.

## Repository

GitHub: <https://github.com/Schello805/Elternzeugnis>

## Lizenz

Dieses Projekt ist zur freien nicht-kommerziellen Nutzung verfuegbar. Details stehen in der [LICENSE](LICENSE).
