const fs = require('fs');
const path = require('path');

function cleanJsonAndSave(inputPath, outputPath) {
    let content = fs.readFileSync(inputPath, 'utf8');
    // Remove trailing commas
    content = content.replace(/,\s*}/g, '}');
    const data = JSON.parse(content);
    
    // Remove [cite: X] artifacts
    for (const key in data) {
        data[key] = data[key].replace(/\[cite:\s*\d+\]/g, '').trim();
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Cleaned and saved ${outputPath}`);
}

try {
    cleanJsonAndSave('translation_id.json', 'locales/id.json');
} catch (e) {
    console.error('Error on ID', e);
}

try {
    cleanJsonAndSave('translation_ph', 'locales/ph.json');
} catch (e) {
    console.error('Error on PH', e);
}

