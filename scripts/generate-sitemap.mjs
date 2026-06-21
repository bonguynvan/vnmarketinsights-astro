import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = process.argv[2] || '../dist';
const DIST_DIR = path.resolve(__dirname, inputDir);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://vnmarketinsights.com';

// Pages that should NEVER appear in the sitemap. Utility/tool/admin
// surfaces dilute topical authority and waste crawl budget.
const EXCLUDED_PATHS = new Set([
  '/404',
  '/admin/leads',
  '/snapshot',
  '/keywords',
  '/workspace',
  '/start',
]);

const EXCLUDED_PREFIXES = ['/admin/', '/api/'];

// Per-section priority and changefreq. Match by URL prefix.
const SECTION_META = [
  { match: (u) => u === '/',                            priority: '1.0', changefreq: 'weekly'  },
  { match: (u) => u.startsWith('/insights/'),           priority: '0.8', changefreq: 'monthly' },
  { match: (u) => u.startsWith('/topics'),              priority: '0.9', changefreq: 'monthly' },
  { match: (u) => u.startsWith('/tools'),               priority: '0.7', changefreq: 'monthly' },
  { match: (u) => u === '/glossary' || u === '/about'
                  || u === '/changelog',                priority: '0.6', changefreq: 'monthly' },
  // Topic pages and everything else
  { match: () => true,                                  priority: '0.8', changefreq: 'monthly' },
];

function getHtmlFiles(dir) {
  let results = [];
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function htmlFileToUrlPath(htmlFile) {
  let rel = path.relative(DIST_DIR, htmlFile).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) rel = rel.replace('/index.html', '');
  else rel = rel.replace(/\.html$/, '');
  return '/' + rel;
}

function isExcluded(urlPath) {
  if (EXCLUDED_PATHS.has(urlPath)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => urlPath.startsWith(prefix));
}

// Find the source file for a given URL path so we can read its real
// git mtime instead of stamping everything with build time.
function resolveSourceFile(urlPath) {
  const candidates = [];
  if (urlPath === '/') {
    candidates.push('src/pages/index.astro');
  } else if (urlPath.startsWith('/insights/') && urlPath !== '/insights') {
    const slug = urlPath.replace(/^\/insights\//, '').replace(/\/$/, '');
    candidates.push(`src/pages/insights/${slug}.astro`);
    // Markdown collection lookup: filenames are prefixed like 02-{slug}.md
    try {
      const articlesDir = path.join(PROJECT_ROOT, 'src/content/articles');
      if (fs.existsSync(articlesDir)) {
        const match = fs.readdirSync(articlesDir).find((f) =>
          f.endsWith('.md') && f.replace(/^\d+-/, '').replace(/\.md$/, '') === slug
        );
        if (match) candidates.push(`src/content/articles/${match}`);
      }
    } catch {
      // ignore
    }
    candidates.push('src/pages/insights/[slug].astro');
  } else {
    const clean = urlPath.replace(/^\//, '').replace(/\/$/, '');
    candidates.push(`src/pages/${clean}.astro`);
    candidates.push(`src/pages/${clean}/index.astro`);
  }
  for (const rel of candidates) {
    const abs = path.join(PROJECT_ROOT, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function getGitLastMod(sourceFile) {
  if (!sourceFile) return null;
  try {
    const rel = path.relative(PROJECT_ROOT, sourceFile).replace(/\\/g, '/');
    const out = execSync(`git log -1 --format=%cI -- "${rel}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function getFsLastMod(htmlFile) {
  try {
    return fs.statSync(htmlFile).mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function getMeta(urlPath) {
  for (const section of SECTION_META) {
    if (section.match(urlPath)) {
      return { priority: section.priority, changefreq: section.changefreq };
    }
  }
  return { priority: '0.5', changefreq: 'monthly' };
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateSitemap() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`Output directory not found: ${DIST_DIR}`);
    process.exit(1);
  }

  const htmlFiles = getHtmlFiles(DIST_DIR);
  const entries = [];

  for (const htmlFile of htmlFiles) {
    const urlPath = htmlFileToUrlPath(htmlFile);
    if (isExcluded(urlPath)) continue;

    const source = resolveSourceFile(urlPath);
    const lastmod = getGitLastMod(source) || getFsLastMod(htmlFile);
    const { priority, changefreq } = getMeta(urlPath);

    const trailing = urlPath === '/' ? '/' : `${urlPath}/`;
    entries.push({
      loc: `${SITE_URL}${trailing}`,
      lastmod,
      changefreq,
      priority,
    });
  }

  // Stable ordering for diff-friendly output.
  entries.sort((a, b) => a.loc.localeCompare(b.loc));

  const body = entries
    .map(({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
    .join('\n');

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  const targetPath = path.join(DIST_DIR, 'sitemap.xml');
  fs.writeFileSync(targetPath, sitemapContent);
  console.log(`Sitemap generated at ${targetPath} with ${entries.length} URLs.`);
}

generateSitemap();
