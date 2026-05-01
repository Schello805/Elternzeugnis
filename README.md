# Elternzeugnis

Eine tabletfreundliche Web-App, mit der Kinder ein liebevolles, humorvolles und pädagogisch sinnvolles Zeugnis für Eltern oder andere Bezugspersonen erstellen können. Im Mittelpunkt stehen Beziehung, Selbstwirksamkeit, Zuhören und konkrete Wünsche statt bloßer Bewertung.

## Idee

Kinder sollen nicht einfach „bewerten“, sondern lernen, ihre Wahrnehmung freundlich und klar auszudrücken: Was tut mir gut? Wo brauche ich mehr Unterstützung? Welcher gemeinsame Moment war wichtig? Die App verbindet spielerische Schulnoten mit positiven Formulierungen, Freitextfeldern und pädagogischen Hinweisen bei schwierigen Bewertungen.

## Funktionen

- Zeugnis-Editor für Tablet, Desktop und Smartphone
- direkte Eingabe der Noten im Zeugnisdesign
- Start-Dashboard für die wichtigsten Wege
- Kindermodus mit großer Touch-Bedienung
- Startauswahl für Kind, Elternteil, Jahr und Design vor dem Kindermodus
- beziehungsorientierte Fragen statt reiner Leistungsbewertung
- Stammdaten für Kinder, Eltern und Bezugspersonen
- Verlauf über gespeicherte Zeugnisse pro Jahr
- grafische Auswertungen mit Durchschnitt und Kategorien
- geführte Leerzustände und Erfolgsmeldungen
- pädagogische Wunschbausteine bei schwierigen Bewertungen
- Bewertungsbereiche wie Geduld, Zuhören, Spielzeit, Fairness und Lernhilfe
- Pädagogische Hinweise bei Note 5 oder 6
- Zeugnisvorschau im druckbaren Format
- Drucken oder als PDF speichern über den Browser
- Erinnerungssystem mit SMTP-Konfiguration über `.env`
- SMTP-Konfiguration und Testmail direkt im Frontend
- PDF-Export
- mehrere Zeugnisdesigns
- Design-Auswahl mit Mini-Vorschau
- App-Logo, Favicon und Web-App-Manifest
- Export und Import der App-Daten
- Footer mit GitHub-Link und automatischer Versions-/Revisionsanzeige

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Die App startet damit Frontend und Reminder-API. Das Frontend läuft standardmäßig unter:

```text
http://127.0.0.1:5173/
```

Die Reminder-API läuft unter:

```text
http://127.0.0.1:4174/
```

## Installation auf Debian oder Ubuntu

Das Installationsskript richtet Node.js, Abhängigkeiten, Build, `.env`, systemd-Service und Prüfungen ein:

```bash
curl -fsSL https://raw.githubusercontent.com/Schello805/Elternzeugnis/main/scripts/install-debian-ubuntu.sh | sudo bash
```

Standardwerte:

- App-Verzeichnis: `/opt/elternzeugnis`
- Service: `elternzeugnis`
- Adresse: `http://127.0.0.1:4174/`

Optionale Anpassung:

```bash
APP_DIR=/opt/elternzeugnis APP_PORT=4174 sudo -E bash scripts/install-debian-ubuntu.sh
```

Das Skript prüft anschließend:

- systemd-Service ist aktiv
- `/api/health` antwortet
- Frontend ist erreichbar
- Node.js und npm sind verfügbar

## Update auf Debian oder Ubuntu

Im installierten Repository:

```bash
sudo /opt/elternzeugnis/scripts/update-debian-ubuntu.sh
```

Das Update-Skript:

- sichert `.env` und `data/` nach `/var/backups/elternzeugnis`
- zieht `origin/main`
- installiert Abhängigkeiten per `npm ci`
- baut die App neu
- startet den systemd-Service neu
- prüft Service, Healthcheck und Frontend

## Erinnerungen per E-Mail

Erstelle eine `.env` Datei nach dem Muster aus `.env.example`:

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

Erinnerungen werden in `data/reminders.json` gespeichert. Dieser Ordner wird nicht versioniert.

## Build

```bash
npm run build
```

Beim Starten und Bauen wird automatisch `src/generated/version.ts` aktualisiert. Die Anzeige im Footer nutzt die Paketversion aus `package.json` und, falls vorhanden, den aktuellen Git-Commit.

## Pädagogische Leitlinien

- Das Kind steht mit seinen Bedürfnissen im Mittelpunkt.
- Eine schlechte Note ist kein Angriff, sondern ein Gesprächsanlass.
- Die App formuliert Verbesserung als Wunsch, nicht als Vorwurf.
- Bei Note 5 oder 6 erscheinen konkrete, kleine und familiennahe Handlungsideen.
- Erst Stärken wahrnehmen, dann einen nächsten Schritt vereinbaren.
- Eltern werden nicht beschämt, sondern zum Zuhören und Nachfragen eingeladen.
- Wiederholte Zeugnisse machen sichtbar, welche Bedürfnisse konstant bleiben und wo Beziehung wächst.

## Daten

Die App speichert Eingaben im Browser des verwendeten Geräts. Es werden keine Tracking-Dienste verwendet.

Für E-Mail-Erinnerungen speichert der API-Server Erinnerungsdaten in `data/reminders.json`. SMTP-Zugangsdaten liegen in der `.env` Datei. Die SMTP-Konfiguration kann über die Oberfläche gepflegt werden.

## Repository

GitHub: <https://github.com/Schello805/Elternzeugnis>

## Lizenz

Dieses Projekt ist zur freien nicht-kommerziellen Nutzung verfügbar. Details stehen in der [LICENSE](LICENSE).
