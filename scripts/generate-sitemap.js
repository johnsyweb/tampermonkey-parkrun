const fs = require('fs');
const path = require('path');

// Configuration - update baseHost and baseUrl as necessary
const baseHost = 'https://www.johnsy.com';
const baseUrl = '/tampermonkey-parkrun';
const siteDir = path.join(__dirname, '..', 'docs', '_site');
const outPath = path.join(siteDir, 'sitemap.xml');

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function urlForFile(file) {
  const rel = path.relative(siteDir, file).replace(/\\/g, '/');
  if (rel === 'index.html') return `${baseHost}${baseUrl}/`;
  if (rel.endsWith('/index.html')) {
    const dir = rel.replace(/\/index.html$/, '');
    return `${baseHost}${baseUrl}/${dir}/`.replace(/([^:])\/+/g, '$1/');
  }
  return `${baseHost}${baseUrl}/${rel}`.replace(/([^:])\/+/g, '$1/');
}

const files = walk(siteDir).filter((f) => f.endsWith('.html'));
const entries = files.map((f) => {
  const stat = fs.statSync(f);
  return {
    loc: urlForFile(f),
    lastmod: new Date(stat.mtimeMs).toISOString().slice(0, 10),
  };
});

const xmlParts = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
];

for (const e of entries) {
  xmlParts.push('  <url>');
  xmlParts.push(`    <loc>${e.loc}</loc>`);
  xmlParts.push(`    <lastmod>${e.lastmod}</lastmod>`);
  xmlParts.push('    <changefreq>monthly</changefreq>');
  xmlParts.push('    <priority>0.6</priority>');
  xmlParts.push('  </url>');
}

xmlParts.push('</urlset>');

fs.writeFileSync(outPath, xmlParts.join('\n') + '\n', 'utf8');
console.log('Wrote', outPath);
