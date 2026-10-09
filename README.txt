TSV Tischtennis – Admin Version 1.0

INSTALLATION
1. Alle Dateien und den Ordner uploads (wird beim ersten Upload angelegt) ins Root des GitHub-Pages-Repositories hochladen.
2. In GitHub unter Settings > Pages GitHub Pages für den richtigen Branch/Ordner aktivieren.
3. Die Seite im Browser aufrufen; über „Administration“ unten den Adminbereich öffnen.
4. Unter github.com/settings/personal-access-tokens einen Fine-grained Personal Access Token für genau dieses Repository mit Contents: Read and write erstellen. Token nicht weitergeben.
5. GitHub-Benutzer/Organisation, Repository, Branch und Token eingeben. Die teams.json muss bereits im Repository liegen.
6. Mannschaften/Links/Dateien verwalten und auf „Änderungen auf GitHub speichern“ klicken.

WICHTIG ZUR SICHERHEIT
Dies ist ein token-geschützter Bearbeitungszugang, KEIN serverseitig abgesicherter privater Administrationsbereich. Der Admin-Link und der HTML/JS-Code sind öffentlich. Nur ein gültiger GitHub-Token mit Schreibrechten erlaubt Änderungen. Der Token wird nur im Arbeitsspeicher des geöffneten Tabs gehalten, nicht im Quellcode oder localStorage. Kein Passwort in den HTML-Code eintragen.

ÖFFENTLICHE DATEIEN
Dateien im öffentlichen GitHub-Pages-Repository sind öffentlich zugänglich. Keine geheimen Spiel-PINs, Passwörter oder personenbezogenen vertraulichen Dokumente hochladen! Bestehende J15-Spiel-PINs werden lediglich als bisheriger Link übernommen; die PDF selbst ist NICHT im Paket enthalten. Entfernen Sie den Link, falls das Dokument nicht veröffentlicht werden soll.

KOSTEN
Für ein öffentliches Repository mit GitHub Pages und üblicher Nutzung fallen im Rahmen der geltenden kostenlosen GitHub-Kontingente keine zusätzlichen laufenden Kosten an. GitHub-Regeln und Limits beachten.

GRENZEN
Maximal 20 MB pro Datei (konservatives Limit). Beim Speichern erfolgen mehrere einzelne GitHub-Commits; bei Unterbrechung kann ein Teil bereits hochgeladen sein. Die Seite sollte über GitHub Pages/HTTPS geöffnet werden, nicht lokal per file://.

Version 1.1: Dateibuttons zeigen den Dateinamen ohne letzte Erweiterung; Gesamt-Spielplan-Kachel mit im Admin editierbarer URL. Bestehende teams.json bleibt kompatibel, sofern bei Updates die bestehende Datei nicht durch die Beispieldatei überschrieben wird.
