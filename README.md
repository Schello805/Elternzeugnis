# Elternzeugnis

Eine tabletfreundliche Web-App, mit der Kinder ein liebevolles, humorvolles und pädagogisch sinnvolles Zeugnis für Eltern oder andere Bezugspersonen erstellen können. Im Mittelpunkt stehen Beziehung, Selbstwirksamkeit, Zuhören und konkrete Wünsche statt bloßer Bewertung.

## Idee

Kinder sollen nicht einfach „bewerten“, sondern lernen, ihre Wahrnehmung freundlich und klar auszudrücken: Was tut mir gut? Wo brauche ich mehr Unterstützung? Welcher gemeinsame Moment war wichtig? Die App verbindet spielerische Schulnoten mit positiven Formulierungen, Freitextfeldern und pädagogischen Hinweisen bei schwierigen Bewertungen.

Der pädagogische Kern ist ein Gespräch auf Augenhöhe. Ein Elternzeugnis soll kein Pranger sein, sondern ein leichter Einstieg in Familienreflexion: Kinder üben, Bedürfnisse zu benennen, Eltern bekommen konkrete Hinweise, und beide Seiten können gemeinsam kleine nächste Schritte vereinbaren.

## Funktionen

- Zeugnis-Editor für Tablet, Desktop und Smartphone
- direkte Eingabe der Noten im Zeugnisdesign
- direkter Einstieg in Zeugnis und Kindermodus ohne Dashboard-Umweg
- Kindermodus mit großer Touch-Bedienung
- Startauswahl für Kind, Elternteil, Kalenderjahr und Design vor dem Kindermodus
- Geburtsdatum in den Kinder-Stammdaten für altersgerechte Texte
- beziehungsorientierte Fragen statt reiner Leistungsbewertung
- Stammdaten für Kinder, Eltern und Bezugspersonen
- Verlauf über gespeicherte Zeugnisse pro Jahr
- zentrale Speicherung auf dem lokalen Server für Smartphone, Tablet und Desktop
- SQLite-Datenbank mit automatischer Migration aus älteren JSON-Daten
- Konflikterkennung, wenn mehrere Geräte gleichzeitig Änderungen speichern
- grafische Auswertungen mit Durchschnitt und Kategorien
- pädagogische Auswertungen zu wiederkehrenden Bedürfnissen und Ressourcen
- geführte Leerzustände und Erfolgsmeldungen
- pädagogische Wunschbausteine bei schwierigen Bewertungen
- Bewertungsbereiche wie Geduld, Zuhören, Spielzeit, Fairness und Lernhilfe
- Pädagogische Hinweise bei Note 5 oder 6
- Zeugnisvorschau im druckbaren Format
- Drucken oder als PDF speichern über den Browser
- Erinnerungssystem mit SMTP-Konfiguration über `.env`
- SMTP-Konfiguration und Testmail direkt im Frontend
- PDF-Export
- vier deutlich unterschiedliche Zeugnisdesigns: Urkundenstil, Stickerbogen, Naturtagebuch und Sternenmission
- Design-Auswahl mit Mini-Vorschau
- App-Logo, Favicon und Web-App-Manifest
- Export und Import der App-Daten
- Adminseite mit Status, Speicherorten und manuellem Backup
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

Für die lokale Entwicklung bleibt die API absichtlich auf `127.0.0.1` gebunden. Für eine Installation im LXC nutzt das Installationsskript dagegen `0.0.0.0`, damit Tablets im Heimnetz die App erreichen können.

## Installation auf Debian oder Ubuntu

Das Installationsskript richtet Node.js, SQLite, Abhängigkeiten, Build, `.env`, systemd-Service und Prüfungen ein:

```bash
curl -fsSL https://raw.githubusercontent.com/Schello805/Elternzeugnis/main/scripts/install-debian-ubuntu.sh | sudo bash
```

Standardwerte:

- App-Verzeichnis: `/opt/elternzeugnis`
- Service: `elternzeugnis`
- Host-Bindung: `0.0.0.0`
- Port: `4147`
- lokale Serveradresse: `http://127.0.0.1:4147/`
- Netzwerkadresse im LXC-Beispiel: `http://10.10.50.109:4147/`

Empfohlene Installation für einen LXC, der im Netzwerk unter `10.10.50.109` erreichbar ist:

```bash
curl -fsSL https://raw.githubusercontent.com/Schello805/Elternzeugnis/main/scripts/install-debian-ubuntu.sh -o install-elternzeugnis.sh
sudo APP_PORT=4147 APP_HOST=0.0.0.0 PUBLIC_URL=http://10.10.50.109:4147 bash install-elternzeugnis.sh
```

Optionale Anpassung aus einem lokalen Checkout:

```bash
sudo APP_DIR=/opt/elternzeugnis APP_PORT=4147 APP_HOST=0.0.0.0 PUBLIC_URL=http://10.10.50.109:4147 bash scripts/install-debian-ubuntu.sh
```

Das Skript prüft anschließend:

- systemd-Service ist aktiv
- `/api/health` antwortet
- Frontend ist erreichbar
- Node.js und npm sind verfügbar

Wenn die App im LXC selbst erreichbar ist, aber nicht vom Tablet, helfen diese Prüfungen:

```bash
sudo systemctl status elternzeugnis --no-pager
curl -fsS http://127.0.0.1:4147/api/health
sudo ss -ltnp | grep 4147
```

Der Healthcheck sollte `host` und `port` anzeigen. Wenn dort `host` auf `0.0.0.0` steht und `127.0.0.1:4147` funktioniert, liegt ein verbleibendes Problem meist an LXC-, Proxmox- oder Firewall-Regeln.

## Update auf Debian oder Ubuntu

Im installierten Repository:

```bash
sudo /opt/elternzeugnis/scripts/update-debian-ubuntu.sh
```

Das Update-Skript:

- sichert `.env` und `data/` nach `/var/backups/elternzeugnis`
- zieht `origin/main`
- installiert fehlendes SQLite und Abhängigkeiten per `npm ci`
- baut die App neu
- aktualisiert die systemd-Service-Datei passend zum aktuellen `APP_DIR`
- startet den systemd-Service neu
- prüft Service, Healthcheck und Frontend

Das Update überschreibt bestehende SMTP- oder Erinnerungsdaten nicht. Ältere Standardwerte werden aber automatisch auf den Netzwerkbetrieb migriert: `HOST=127.0.0.1` wird zu `HOST=0.0.0.0`, `PORT=4174` wird zu `PORT=4147`. Eigene abweichende Ports bleiben erhalten.

Hinweis: Empfohlen ist `/opt/elternzeugnis`. Wenn die App bewusst unter `/root/Elternzeugnis` betrieben wird, schreibt das Skript den systemd-Service passend als `root`, weil ein normaler Systembenutzer nicht durch das `/root` Verzeichnis navigieren darf.

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
- Verschiedene Designs unterstützen unterschiedliche Kinder: feierlich, verspielt, ruhig-naturnah oder abenteuerlich.

## Daten

Die App speichert Stammdaten, Entwurf und Zeugnisverlauf zentral auf dem lokalen Server in einer SQLite-Datenbank:

```text
data/elternzeugnis.sqlite
```

Dadurch sehen Smartphone, Tablet und Desktop denselben Datenstand, solange sie dieselbe lokale Installation aufrufen. Geöffnete Geräte laden Änderungen beim Zurückwechseln in den Tab und regelmäßig im Hintergrund nach. Wenn zwei Geräte parallel speichern, erkennt die App den Konflikt und lädt die aktuelle Serverversion, statt unbemerkt Daten zu überschreiben.

Zusätzlich legt der Browser weiterhin ein lokales Backup im `localStorage` an. Wenn der Server beim ersten Start noch leer ist und auf einem Gerät bereits ältere lokale Daten vorhanden sind, übernimmt die App diese Daten automatisch in die zentrale Ablage. Ältere `data/app-data.json` Daten werden beim Serverstart automatisch in SQLite migriert.

Für E-Mail-Erinnerungen speichert der API-Server Erinnerungsdaten in `data/reminders.json`. SMTP-Zugangsdaten liegen in der `.env` Datei. Die SMTP-Konfiguration kann über die Oberfläche gepflegt werden.

Das Installations- und Update-Skript sichert den kompletten Ordner `data/`, also auch `elternzeugnis.sqlite`, `reminders.json` und Backups. Zusätzlich legt der Server täglich ein Backup unter `data/backups/` an. Über die Adminseite kann jederzeit manuell ein Backup erstellt werden.

## Screenshots


<img width="1713" height="651" alt="Bildschirmfoto 2026-05-02 um 11 52 45" src="https://github.com/user-attachments/assets/6994b018-41c4-4806-a7ff-afe423d847e7" />


<img width="1711" height="737" alt="Bildschirmfoto 2026-05-02 um 11 53 03" src="https://github.com/user-attachments/assets/cfdd71e4-6400-4b77-a1fe-21a4a2780618" />


## Lizenz

Dieses Projekt ist zur freien nicht-kommerziellen Nutzung verfügbar. Details stehen in der [LICENSE](LICENSE).
