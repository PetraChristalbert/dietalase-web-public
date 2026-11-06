const fs = require('fs');
const path = require('path');

const en = require('../locales/en.json');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sort keys by length of value (longest first)
    const keys = Object.keys(en).sort((a, b) => en[b].length - en[a].length);
    
    let replaceCount = 0;
    
    for (const key of keys) {
        const val = en[key];
        if (val.length <= 1) continue;
        
        const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexStr = escapedVal.replace(/\\s\+/g, '\\s+').replace(/\s+/g, '\\s+');
        
        // text nodes
        const regex = new RegExp(`>\\s*${regexStr}\\s*<`, 'g');
        const originalContent = content;
        content = content.replace(regex, `><%= __('${key}') %><`);
        
        // placeholders
        const placeholderRegex = new RegExp(`placeholder=["']\\s*${regexStr}\\s*["']`, 'g');
        content = content.replace(placeholderRegex, `placeholder="<%= __('${key}') %>"`);
        
        // Some texts might be right after a quote or new line, but this > < is safest.
        // Let's also do a more general replace for things that are alone on a line
        const lineRegex = new RegExp(`^\\s*${regexStr}\\s*$`, 'gm');
        content = content.replace(lineRegex, ` <%= __('${key}') %> `);

        if (content !== originalContent) {
            replaceCount++;
        }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Replaced ${replaceCount} keys in ${path.basename(filePath)}`);
}

replaceInFile('views/index.ejs');
replaceInFile('views/merchant_hub.ejs');
