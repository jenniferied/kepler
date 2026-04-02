#!/usr/bin/env node

/**
 * Generiert automatisch ein Manifest aller Journal-Einträge im journal/ Ordner
 * Kann manuell ausgeführt oder in einen Build-Prozess integriert werden
 */

const fs = require('fs');
const path = require('path');

const JOURNAL_DIR = path.join(__dirname, '..', 'journal');
const OUTPUT_FILE = path.join(__dirname, '..', 'journal', 'manifest.json');

// Lese alle .md Dateien aus dem journal/ Ordner
try {
    const files = fs.readdirSync(JOURNAL_DIR)
        .filter(file => file.endsWith('.md') && file.startsWith('journal-'))
        .map(file => `journal/${file}`)
        .sort(); // Alphabetisch sortiert (chronologisch durch YYYY-MM-DD Format)

    // Schreibe Manifest
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(files, null, 2));
    
    console.log(`✓ Journal-Manifest erstellt mit ${files.length} Einträgen:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log(`\nGeschrieben nach: ${OUTPUT_FILE}`);
} catch (error) {
    console.error('Fehler beim Erstellen des Manifests:', error);
    process.exit(1);
}

