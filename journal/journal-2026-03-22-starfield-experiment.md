# Sterne, die auf dich zukommen: Das Starfield-Experiment

**22. März 2026**

Keplers Musik hat etwas Kosmisches. Die Synths schweben, die Beats treiben vorwärts, und wenn man die Augen schließt, fühlt es sich an wie eine Reise durch den Raum. Diese Qualität wollte ich auf die Website bringen — nicht als plumpe Weltraum-Illustration, sondern als subtile Hintergrund-Animation.

Das Starfield-Experiment: Weiße Punkte, die sich vom Zentrum des Bildschirms nach außen bewegen, dabei größer werden und an den Rändern verschwinden. Wie Sterne, die auf einen zukommen. Der klassische "Warp Speed"-Effekt, aber zurückhaltend — ein Flüstern, kein Schrei.

Die technische Umsetzung nutzt Canvas 2D mit Object Pooling: 200 Sterne werden einmal erzeugt und wiederverwendet, kein Garbage Collection-Druck während der Animation. Jeder Stern hat eine Z-Koordinate (Tiefe), die per requestAnimationFrame reduziert wird. Perspektivische Projektion macht den Rest — je näher ein Stern kommt, desto größer und heller erscheint er.

Ein Detail, das den Unterschied macht: 25% der Sterne haben einen leichten Blau-Stich (Hue 210-240°). Das gibt dem Feld eine Kühle, die zur Musik passt. Und der Trail-Effekt — ein semi-transparentes Clearing des Canvas pro Frame — erzeugt Schweifstreifen, die Geschwindigkeit suggerieren.

Accessibility war ein Muss: `prefers-reduced-motion` wird respektiert. Wer Animationen deaktiviert hat, sieht stattdessen ein statisches Sternenfeld — schön, aber nicht in Bewegung. Kein Nutzer wird ausgeschlossen.

## Die Technologie dahinter

Canvas 2D statt WebGL — bewusst einfach gehalten. Die Berechnung ist trivial: Für jeden Stern `z -= speed`, dann Perspektive `p = maxDepth / (z + 1)`, Screen-Position `sx = centerX + star.x * p`. Das läuft auf jedem Gerät flüssig.

Das Pooling-Pattern verhindert Frame-Drops: Statt `new Object()` bei jedem Reset wird der existierende Stern überschrieben. Keine Allokationen, keine GC-Pausen. Die Animation bleibt bei konstanten 60fps.

Integration in die bestehende Architektur: Der Starfield wird nur auf der Overview-Seite gestartet und per EventBus gestoppt, wenn der Nutzer zu einer anderen Seite navigiert. Zero CPU-Last auf allen anderen Seiten.

---

## Reflexion

- **Tools:** Canvas 2D API, requestAnimationFrame, EventBus
- **Workflow:** Parametrisches Design — Speed, Stern-Anzahl, Trail-Länge sind konfigurierbar, schnelle Iteration
- **Autorschaft:** Die Idee und die ästhetischen Parameter kommen von mir, die Mathematik ist Standard
- **Scheitern:** Erste Version war zu schnell und zu steil — fühlte sich an wie ein Bildschirmschoner aus den 90ern. Langsamere Geschwindigkeit und breitere Streuung waren die Lösung.
- **Erkenntnis:** Subtilität ist schwieriger als Spektakel. Die besten Hintergrund-Effekte bemerkt man erst, wenn sie fehlen.
- **Offene Frage:** Sollte die Starfield-Animation auf die Musik reagieren? Audio-reaktive Visualisierungen könnten den nächsten Schritt darstellen.

**Keywords:** #Canvas #Animation #Starfield #Performance #Accessibility
