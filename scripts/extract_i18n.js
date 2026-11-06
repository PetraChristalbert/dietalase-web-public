const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const VIEWS_DIR = path.join(__dirname, '../views');
const CHUNK_SIZE = 50;

function extractText(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(content, { decodeEntities: false });
    const extracted = {};
    let counter = 1;
    
    // Find all elements that might contain direct text
    $('h1, h2, h3, h4, h5, h6, p, span, a, button, label, li, td, th, div').each(function() {
        // Only extract direct text nodes of this element (not nested tags text)
        const textNodes = $(this).contents().filter(function() {
            return this.type === 'text';
        });
        
        let text = '';
        textNodes.each(function() {
            text += $(this).text();
        });

        text = text.trim().replace(/\s+/g, ' ');
        
        // Filter out empty, very short, or pure code/EJS strings
        if (text && text.length > 1 && !text.includes('<%') && !text.match(/^[0-9\W]+$/)) {
            // Check if it's already extracted to avoid duplicates
            if (!Object.values(extracted).includes(text)) {
                 const baseName = path.basename(filePath, '.ejs');
                 extracted[`${baseName}_text_${counter}`] = text;
                 counter++;
            }
        }
    });

    // Extract placeholders from inputs
    $('input[placeholder], textarea[placeholder]').each(function() {
        const placeholder = $(this).attr('placeholder').trim();
        if (placeholder && !placeholder.includes('<%') && !Object.values(extracted).includes(placeholder)) {
            const baseName = path.basename(filePath, '.ejs');
            extracted[`${baseName}_placeholder_${counter}`] = placeholder;
            counter++;
        }
    });

    return extracted;
}

const allExtracted = {};

// We just extract index.ejs and merchant_hub.ejs as requested
const filesToExtract = ['index.ejs', 'merchant_hub.ejs'];

filesToExtract.forEach(file => {
    console.log(`Extracting from ${file}...`);
    const extracted = extractText(path.join(VIEWS_DIR, file));
    Object.assign(allExtracted, extracted);
});

// Chunk the JSON
const entries = Object.entries(allExtracted);
const totalChunks = Math.ceil(entries.length / CHUNK_SIZE);

const outputDir = path.join(__dirname, '../locales_export');
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}

for (let i = 0; i < totalChunks; i++) {
    const chunk = Object.fromEntries(entries.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    const fileName = `en_chunk_${i + 1}.json`;
    fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(chunk, null, 2));
    console.log(`Saved ${fileName} with ${Object.keys(chunk).length} keys.`);
}

console.log('Extraction complete!');
