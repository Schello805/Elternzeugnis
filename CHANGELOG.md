# Changelog

## 0.1.15

- Update-Skript entquotet Werte aus `.env`
- Portprüfung ergänzt, damit `curl` keine ungültige URL mit Anführungszeichen erhält
- `PORT` wird beim Update normalisiert zurück in `.env` geschrieben
- Versionsnummer erhöht

## 0.1.14

- Design-Auswahl von Farbstreifen auf Mini-PDF-Vorschauen umgestellt
- Vorschauen zeigen Kopfbereich, Notenfelder, Textflächen und Signaturbereich
- Vorschauen unterscheiden Urkundenstil, Stickerbogen, Naturtagebuch und Sternenmission deutlicher
- Versionsnummer erhöht

## 0.1.13

- Zeugnisjahr auf Kalenderjahr umgestellt
- SQLite-Datenbank `data/elternzeugnis.sqlite` mit Migration aus `data/app-data.json` ergänzt
- Konflikterkennung für parallele Änderungen mehrerer Geräte ergänzt
- Geburtsdatum für Kinder in den Stammdaten ergänzt
- Fragen und Wunschbausteine werden altersabhängig formuliert
- Einrichtungsführung für unvollständige Stammdaten ergänzt
- Pädagogische Auswertung mit Bedürfnissen und Ressourcen erweitert
- Zeugnisarchiv mit Öffnen und Markieren wichtiger Zeugnisse ergänzt
- Offline- und Konflikthinweise im Synchronisationsstatus verbessert
- Adminseite mit Status, Speicherorten, Zählwerten und manuellem Backup ergänzt
- Tägliche automatische Backups vorbereitet
- Versionsnummer erhöht

## 0.1.12

- Zentrale serverseitige Speicherung für Stammdaten, Entwurf und Zeugnisverlauf ergänzt
- Neue API-Endpunkte `/api/app-data` zum Laden und Speichern der App-Daten ergänzt
- Frontend synchronisiert Änderungen automatisch mit `data/app-data.json`
- Bestehende Browserdaten werden beim ersten Start in die zentrale Ablage übernommen, wenn der Server noch leer ist
- Andere geöffnete Geräte laden Serveränderungen bei Fokus und regelmäßig im Hintergrund nach
- Synchronisationsstatus im Header ergänzt
- README zur neuen gemeinsamen Datenspeicherung aktualisiert
- Versionsnummer erhöht

## 0.1.11

- Browser-Fallback für Geräte ohne `crypto.randomUUID()` ergänzt
- ID-Erzeugung funktioniert nun auch auf älteren Tablet- und Safari-Versionen
- Versionsnummer erhöht

## 0.1.10

- Update-Skript schreibt die systemd-Service-Datei passend zum aktuellen `APP_DIR` neu
- Installations- und Update-Skript behandeln Installationen unter `/root/...` korrekt
- Service-Benutzer kann über `SERVICE_USER` explizit gesetzt werden
- README um Hinweis zu `/root/Elternzeugnis` ergänzt
- Versionsnummer erhöht

## 0.1.9

- Update-Skript migriert alte lokale Standardwerte auf LXC-Netzwerkbetrieb
- Bestehende `HOST=127.0.0.1` Installationen werden automatisch auf `HOST=0.0.0.0` umgestellt
- Bestehende `PORT=4174` Standardinstallationen werden automatisch auf `PORT=4147` umgestellt
- README zur Update-Migration präzisiert
- Versionsnummer erhöht

## 0.1.8

- Server-Host für LXC-Installationen konfigurierbar gemacht
- Installations- und Update-Skript auf Netzwerkbetrieb mit Port 4147 vorbereitet
- README mit LXC-Zugriff, Prüfkommandos und pädagogischem Ansatz aktualisiert
- Vier deutlich unterschiedliche Zeugnisdesigns ergänzt
- Versionsnummer erhöht

## 0.1.7

- Testmail-Fehlerbehandlung verbessert
- Reminder-API liefert bei SMTP- und Validierungsfehlern JSON statt 500-HTML
- E-Mail-Validierung im Frontend ergänzt
- Versionsnummer erhöht

## 0.1.6

- Arbeitsbereich-Navigation in den Header verlegt
- Navbar für Tablet-Nutzung horizontal scrollbar gemacht
- Separate Tab-Leiste im Inhalt entfernt
- Versionsnummer erhöht

## 0.1.5

- Startauswahl vor dem Kindermodus ergänzt
- Kind, Elternteil, Zeugnisjahr, Datum und Design werden vor der Bewertung gewählt
- Versionsnummer erhöht

## 0.1.4

- App-Texte pädagogisch geschärft
- Kategorien stärker auf Bedürfnisse, Beziehung und Selbstwirksamkeit ausgerichtet
- Reminder-E-Mail beziehungsorientierter formuliert
- README um pädagogischen Wert erweitert
- Versionsnummer erhöht

## 0.1.3

- Logo als App-Logo eingebunden
- Favicon und Web-App-Icons ergänzt
- Web-App-Manifest ergänzt
- Versionsnummer erhöht

## 0.1.2

- Installationsskript für Debian und Ubuntu ergänzt
- Update-Skript mit Backup und Prüfungen ergänzt
- Server kann den Produktions-Build aus `dist` ausliefern
- Healthcheck unter `/api/health` ergänzt
- Versionsnummer erhöht

## 0.1.1

- Footer-Text vereinfacht
- Deutsche Umlaute in Oberfläche, E-Mail-Texten und Dokumentation ergänzt
- Versionsnummer erhöht

## 0.1.0

- Erste Version der Elternzeugnis-App
- Tabletfreundlicher Zeugnis-Editor
- Eingabe direkt im Zeugnisdesign
- Stammdatenverwaltung für Kinder und Eltern
- Verlauf über gespeicherte Zeugnisse
- Grafische Auswertungen mit Recharts
- SMTP-basiertes Erinnerungssystem mit API
- SMTP-Konfiguration und Testmail im Frontend
- PDF-Export per jsPDF/html2canvas
- mehrere Zeugnisdesigns
- Start-Dashboard
- Kindermodus mit großen Notenfeldern
- Design-Vorschauen
- schönerer Zeugnisbogen mit Badge und Unterschriftsbereich
- geführte Leerzustände und Erfolgsmeldungen
- Wunschbausteine bei Note 5 oder 6
- Import und Export der lokalen App-Daten
- Druckbare Zeugnisvorschau
- Pädagogische Hinweise bei Note 5 oder 6
- Footer mit GitHub-Link und Revisionsnummer
- README, Lizenz und Projekt-Dokumente ergänzt
