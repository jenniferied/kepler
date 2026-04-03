# Das Unsichtbarkeitsproblem: Kepler vs. Kepler vs. Kepler

**29. März 2026**

"Kepler" googeln und den Musiker finden? Unmöglich. Johannes Kepler, der Astronom aus dem 17. Jahrhundert, dominiert die Suchergebnisse. Dann das Kepler-Weltraumteleskop der NASA. Dann mindestens drei andere Bands und Künstler mit dem gleichen Namen. Unser Kepler? Seite fünf, wenn überhaupt.

Das ist kein theoretisches Problem. Wenn jemand nach einem Konzert nach Hause kommt und "Kepler Musik" googelt, muss er die richtige Website finden. Wenn ein Playlist-Kurator den Namen liest, muss er in drei Klicks auf Spotify landen. Aktuell passiert das nicht.

Die Recherche hat drei Kernerkenntnisse gebracht. Erstens: Nie auf "Kepler" allein optimieren — das ist ein aussichtsloser Kampf gegen Wikipedia und die NASA. Stattdessen den zusammengesetzten Begriff "Kepler Musik" bzw. "keplermusik" als Marken-Anker nutzen. Die Domain keplermusik.de ist Gold wert.

Zweitens: Google braucht Kontext, um Entitäten zu unterscheiden. Schema.org-Markup vom Typ MusicGroup sagt den Suchmaschinen explizit: "Dieser Kepler ist ein Musiker, kein Astronom." Die sameAs-Links zu Spotify, SoundCloud und YouTube bestätigen das. JSON-LD ist das Format der Wahl.

Drittens: MusicBrainz und Wikidata sind die Vertrauensanker, die Google für Knowledge Panels nutzt. Ohne Einträge dort wird es keinen Google-Infokasten geben — egal wie gut die Website optimiert ist. Das ist der nächste Schritt.

Konkret implementiert: Meta-Tags, Open Graph, Twitter Cards, MusicGroup-Schema, robots.txt und sitemap.xml. Die Basis steht. Aber SEO ist ein Marathon, kein Sprint. Die Ergebnisse werden Wochen bis Monate brauchen.

## Die Technologie dahinter

Structured Data in JSON-LD — ein maschinenlesbarer Steckbrief im `<head>` der Seite. Sieht für Menschen unsichtbar aus, aber Suchmaschinen lesen es als Erste. Das @type-Feld "MusicGroup" aktiviert musikspezifische Features in den Suchergebnissen. Die sameAs-Links vernetzen die Online-Präsenzen zu einem kohärenten Identitätsnetz.

Open Graph und Twitter Cards sorgen dafür, dass geteilte Links schön aussehen — mit Bild, Titel und Beschreibung statt einer nackten URL. Für einen Musiker ist das besonders wichtig: Jeder geteilte Link ist eine Mini-Visitenkarte.

---

## Reflexion

- **Tools:** Google Search Console, Schema.org, JSON-LD, Open Graph Protocol
- **Workflow:** Research-heavy — mehr Lesen und Planen als Coden. Die Implementierung selbst war schnell.
- **Autorschaft:** Strategische Entscheidungen (Welche Keywords? Welche Plattformen?) sind rein menschlich. Die Markup-Umsetzung ist delegierbar.
- **Scheitern:** Anfangs wollte ich auf "Kepler electronic music Germany" optimieren — zu lang, zu generisch. "Kepler Musik" ist kürzer, einprägsamer und hat die .de-Domain als Beweis.
- **Erkenntnis:** SEO für Künstler mit Common-Name ist ein Identitätsproblem, kein technisches Problem. Die Technik ist trivial — die Strategie macht den Unterschied.
- **Offene Frage:** Wie lange dauert es, bis MusicBrainz + Wikidata-Einträge in einem Knowledge Panel resultieren?

**Keywords:** #SEO #Discoverability #NameCollision #StructuredData #SchemaOrg
