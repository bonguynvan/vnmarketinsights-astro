
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const SITE_URL = 'https://vnmarketinsights.com';

function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getHtmlFiles(file));
        } else {
            if (file.endsWith('.html')) {
                results.push(file);
            }
        }
    });
    return results;
}

function generateSitemap() {
    if (!fs.existsSync(DIST_DIR)) {
        console.error('Dist directory not found!');
        process.exit(1);
    }

    const htmlFiles = getHtmlFiles(DIST_DIR);
    const urls = htmlFiles
        .map(file => {
            let relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/');

            // Filter out 404 page and other utility pages if needed
            if (relativePath === '404.html') return null;

            // Handle index.html
            if (relativePath.endsWith('/index.html')) {
                relativePath = relativePath.replace('/index.html', '');
            } else if (relativePath === 'index.html') {
                relativePath = '';
            } else {
                relativePath = relativePath.replace('.html', '');
            }

            return `${SITE_URL}/${relativePath}`;
        })
        .filter(Boolean)
        .sort();

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === SITE_URL + '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('')}
</urlset>`;

    fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapContent);
    console.log(`✅ Sitemap generated at dist/sitemap.xml with ${urls.length} URLs.`);
}

generateSitemap();
