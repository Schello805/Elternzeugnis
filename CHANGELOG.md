# Changelog

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
