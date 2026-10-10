TSV Tischtennis Admin v1.4
=================================
NEU:
- Datei-Buttons nutzen die gesamte Innenbreite mit gleichen Seitenabständen.
- Uploads erhalten als Beschriftung den Originaldateinamen ohne letzte Erweiterung.
- Jede Dateibeschriftung ist in der Administration frei editierbar.
- teams.json speichert die Beschriftung unter files[].label.
- Bestehende Dateien ohne label erhalten automatisch den bisherigen Namen ohne Erweiterung.
- Unterüberschrift in der Administration frei editierbar, gespeichert als subtitle.
- Aktuelles Datum rechts daneben in DD.MM.YYYY, automatisch aktualisiert.
- Datenformat version 5; App-Version 1.4. Bisherige Funktionen bleiben erhalten.

INSTALLATION / UPDATE:
Alle Dateien außer teams.json in das bestehende GitHub-Pages-Repository hochladen.
Bestehende teams.json und hochgeladene Dateien NICHT überschreiben oder löschen!
Die App liest ältere Konfigurationen; die Migration wird beim nächsten Speichern
in der Administration dauerhaft in teams.json übernommen.
Bei Neuinstallation teams.json aus diesem ZIP verwenden.
Der bestehende Link J15-Spiel-PINs.pdf bleibt erhalten. Die PDF selbst war im
Ausgangs-ZIP v1.3 nicht enthalten; sie muss im Repository bereits vorhanden sein
oder unter diesem Namen ergänzt werden.
Die Reihenfolge, Trennlinien, Mannschaftslinks, Zusatzlinks und Symbole bleiben erhalten.
Das GitHub-Token niemals veröffentlichen. Dateien im öffentlichen Repo sind öffentlich.
Nach dem Update ggf. Safari-Cache aktualisieren und Seite neu laden.
