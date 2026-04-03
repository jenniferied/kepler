# Von "Everything Machine" zu Kepler: Die Migration

**3. April 2026**

Heute haben wir den letzten Rest des alten Namens entfernt. Die Website hieß ursprünglich "Everything Machine" — ein Arbeitstitel aus der Artistic-Research-Phase, der nie für die Öffentlichkeit gedacht war. Jeder `window.everythingMachineApp`-Aufruf, jeder Meta-Tag, jede Fußzeile: alles musste zu "Kepler" werden.

Was einfach klingt — Suchen und Ersetzen — ist in der Praxis ein Identitätsakt. Ein Name ist nicht nur ein String. Er ist in Variablennamen kodiert, in Seitentiteln, in der Art wie der Code über sich selbst spricht. `window.keplerApp` fühlt sich anders an als `window.everythingMachineApp`. Kompakter, entschiedener.

Gleichzeitig haben wir keplermusik.de gescraped: Logo, Cover-Artworks, Links, Impressum, Datenschutzerklärung. All diese Assets existierten verstreut auf einer WordPress-Seite. Jetzt sind sie Teil eines kohärenten Projekts — versioniert, optimiert, in einer Architektur, die wachsen kann.

Die Links-Seite war der größte Zugewinn: Spotify, Apple Music, Amazon Music, Deezer, SoundCloud, YouTube für Musik. Instagram und TikTok für Social. Alles mit eigenen Icons, Platform-Farben beim Hover, und einem Layout, das an Linktree erinnert, aber selbst gehostet ist. Keine Abhängigkeit von einem Drittdienst, volle Kontrolle.

Und dann die Optimierung: 18 Megabyte PNG-Bilder wurden zu 1.3 Megabyte WebP. Das ist eine 93%ige Reduktion. Die CSS wurde minifiziert, Fonts optimiert, Lazy Loading aktiviert. Die Seite lädt jetzt in einem Bruchteil der Zeit.

## Die Technologie dahinter

Die Migration war ein koordinierter Parallelprozess: Scraping, Rebranding, SEO, Accessibility und Optimierung liefen gleichzeitig in isolierten Git-Worktrees. Jeder Arbeitsstream konnte unabhängig arbeiten, ohne den anderen zu blockieren. Am Ende wurden die Änderungen zusammengeführt — wie Branches in Git, nur auf Task-Ebene.

WebP-Konvertierung via `cwebp` mit Quality 80 — der Sweet Spot zwischen Dateigröße und visueller Qualität. `<picture>`-Elemente mit PNG-Fallback für ältere Browser. Kein Nutzer sieht einen Unterschied, aber der Server liefert 93% weniger Daten.

---

## Reflexion

- **Tools:** Firecrawl (Scraping), cwebp (Bildoptimierung), csso (CSS-Minifizierung), Git Worktrees
- **Workflow:** Massiv parallelisiert — 5 Agents gleichzeitig, jeder mit eigenem Fokus. Effizienter als sequentielle Arbeit.
- **Autorschaft:** Strategische Entscheidungen (Was scrapen? Wie benennen? Welche Plattformen?) sind menschlich. Die Ausführung ist delegierbar.
- **Scheitern:** Erste Scrape-Versuche haben nicht alle Links gefunden — Instagram und TikTok fehlten, weil sie nicht direkt auf keplermusik.de verlinkt waren. Manuelle Ergänzung war nötig.
- **Erkenntnis:** Migration ist nicht nur technisch, sondern auch emotional. Der alte Name loszulassen bedeutet, dass das Projekt erwachsen wird.
- **Offene Frage:** Wann wird keplermusik.de auf die GitHub-Pages-Seite umgeleitet?

**Keywords:** #Migration #Rebranding #Optimierung #WebP #Parallelisierung #Scraping
