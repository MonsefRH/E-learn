const fs = require('fs');
const path = require('path');

// Lire le fichier HTML original
const fullHtml = fs.readFileSync('slides.html', 'utf-8');

// Extraire le head complet
const headMatch = fullHtml.match(/<head>([\s\S]*?)<\/head>/);
const head = headMatch ? headMatch[0] : '';

constide" data-slide-id="${slideId}">${match[2]}</div>`;

    const completeHtml = `<!DOCTYPE html> slideRegex = /<div class="slide" data-slide-id="(\\d+)">([\\s\\S]*?)<\\/div>/g;
let match;

while ((match = slideRegex.exec(fullHtml)) !== null) {
    const slideId = match[1];
    const slideContent = \`<div class="sl
<html lang="en">
${head}
<body>
${slideContent}
</body>
</html>`;

const fileName = `slide${slideId}.html`;
fs.writeFileSync(path.join(__dirname, 'slides', fileName), completeHtml, 'utf-8');
console.log(`✅ Created ${fileName}`);
}
