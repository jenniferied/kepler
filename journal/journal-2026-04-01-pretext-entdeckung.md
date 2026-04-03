# Text, der ausweicht: Die Pretext-Entdeckung

**1. April 2026**

Cheng Lou hat etwas gebaut, das mich sofort fasziniert hat. Pretext — eine Bibliothek, die Text 300 bis 600 Mal schneller messen kann als der Browser. Klingt erstmal nach einem Nischen-Performance-Tool. Aber was damit möglich wird, verändert, wie man über Text auf Webseiten nachdenken kann.

Die Demo, die mich überzeugt hat: Ein Drache aus 80 Segmenten, der der Maus folgt. Der Text auf der Seite weicht ihm aus — fließt um den Körper des Drachen herum, in Echtzeit, bei 60 Bildern pro Sekunde. Kein Ruckeln, kein Flackern. Text als Flüssigkeit, die um Hindernisse strömt.

Für Kepler sehe ich eine subtilere Anwendung. Kein Drache, sondern eine Kugel — ein kleiner Planet, passend zum kosmischen Thema. Man kann ihn über den Text ziehen, und die Worte weichen aus, ordnen sich neu, fließen um das Hindernis herum. Eine spielerische Interaktion mit dem geschriebenen Wort.

Die technische Umsetzung basiert auf zwei Kern-APIs: `prepareWithSegments()` bereitet den Text einmalig vor — zerlegt ihn in messbare Einheiten, berechnet Breiten im Voraus. `layoutNextLine()` ist der Iterator, der Zeile für Zeile umbrechen kann, mit dynamischer Breite. Wenn die Kugel auf einer Zeile liegt, wird die verfügbare Breite eingeschränkt. Der Text passt sich an.

Das Schöne daran: Die DOM-Texte bleiben bestehen. Sie sind für Suchmaschinen und Screenreader weiterhin sichtbar. Das Canvas mit der Pretext-Darstellung liegt darüber als visuelles Enhancement. Wer keine Maus hat oder Animationen deaktiviert hat, sieht den ganz normalen Text. Progressive Enhancement in seiner reinsten Form.

Erste Tests mit der Datenschutzerklärung — absichtlich der langweiligste Text auf der Seite — zeigen, dass selbst juristische Absätze plötzlich faszinierend werden, wenn man sie physisch manipulieren kann. Es gibt dem Lesen eine haptische Qualität, die normalerweise nur gedrucktes Papier hat.

## Die Technologie dahinter

Pretext nutzt die Canvas `measureText()`-API, die denselben Font-Engine wie der DOM verwendet, aber außerhalb des Layout-Trees arbeitet. Das eliminiert den teuersten Teil des DOM-Textmessens: den Reflow. Statt 15-30 Millisekunden pro Messung dauert es 0.05 Millisekunden — reine Arithmetik.

Die Exklusions-Zonen um die Kugel werden geometrisch berechnet: Für jede Textzeile wird geprüft, ob sie den Kreis schneidet. Wenn ja, wird die Zeile in zwei Slots aufgeteilt — links und rechts vom Hindernis. `layoutNextLine()` füllt jeden Slot separat.

Mit 15 KB (gzipped) und null Abhängigkeiten ist Pretext perfekt für eine Vanilla-JS-Architektur. Es wird als ES-Modul über CDN (esm.sh) geladen — kein Build-Step nötig.

---

## Reflexion

- **Tools:** @chenglou/pretext, Canvas 2D, ES Modules, esm.sh CDN
- **Workflow:** Prototyping auf einer isolierten Trial-Seite, dann Integration in die Hauptseite
- **Autorschaft:** Cheng Lou hat das Tool gebaut. Ich wähle die Metapher (Planet statt Drache) und den Einsatzkontext (Musiker-Website statt Tech-Demo).
- **Scheitern:** Der erste Versuch, Text direkt im Canvas zu rendern, hatte falsche Farben und Zeilenabstände. Die Pixel-Genauigkeit zwischen DOM und Canvas zu matchen erfordert Sorgfalt.
- **Erkenntnis:** Die beste Interaktion ist die, die man nicht erklären muss. Man sieht die Kugel, zieht sie instinktiv, und der Text reagiert. Keine Anleitung nötig.
- **Offene Frage:** Kann Pretext auch für audio-reaktive Typografie genutzt werden? Text, der im Rhythmus der Musik pulsiert?

**Keywords:** #Pretext #Typografie #Canvas #TextReflow #ProgressiveEnhancement #ChengLou
