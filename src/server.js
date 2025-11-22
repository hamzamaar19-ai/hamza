const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '../public');
const configPath = path.join(__dirname, '../data/config.json');

function readConfig() {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

function writeConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(publicDir, parsed.pathname.replace(/\/+$/, ''));
  if (parsed.pathname === '/') {
    filePath = path.join(publicDir, 'index.html');
  }
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const type = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function hashString(str) {
  return Array.from(str).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 999983, 7);
}

function priceEstimate(domain) {
  const base = 5 + (15 - Math.min(domain.length, 15));
  const volatility = (hashString(domain) % 2000) / 100;
  return Math.max(4, Math.round((base + volatility) * 100) / 100);
}

function ratingBadge(score) {
  if (score > 90) return '★★★★★ Premium';
  if (score > 75) return '★★★★☆ High Value';
  if (score > 60) return '★★★☆☆ Solid';
  if (score > 45) return '★★☆☆☆ Niche';
  return '★☆☆☆☆ Experimental';
}

function keywordStrength(domain) {
  const vowels = domain.match(/[aeiou]/gi)?.length || 0;
  const repeats = domain.length - new Set(domain).size;
  let score = 50 + vowels * 3 - repeats * 2;
  if (/\d/.test(domain)) score += 4;
  if (/-/.test(domain)) score -= 5;
  return Math.max(10, Math.min(100, Math.round(score)));
}

function buildCharacters(includeNumbers, lettersOnly, allowHyphen) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  let chars = letters.split('');
  if (!lettersOnly && includeNumbers) chars = chars.concat(numbers.split(''));
  if (lettersOnly === false && includeNumbers === false) chars = chars.concat(numbers.split(''));
  if (allowHyphen) chars.push('-');
  return chars;
}

function generateBaseCombos(length, chars, limit, allowHyphen) {
  const results = [];
  function backtrack(prefix) {
    if (results.length >= limit) return;
    if (prefix.length === length) {
      if (!allowHyphen || !prefix.startsWith('-') && !prefix.endsWith('-') && !prefix.includes('--')) {
        results.push(prefix);
      }
      return;
    }
    for (const ch of chars) {
      backtrack(prefix + ch);
      if (results.length >= limit) break;
    }
  }
  backtrack('');
  return results;
}

function randomCombos(length, chars, limit, allowHyphen) {
  const results = new Set();
  while (results.size < limit) {
    let str = '';
    for (let i = 0; i < length; i += 1) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    if (allowHyphen && Math.random() > 0.8) {
      const idx = Math.floor(Math.random() * (str.length - 1)) + 1;
      str = `${str.slice(0, idx)}-${str.slice(idx)}`;
    }
    if (!str.startsWith('-') && !str.endsWith('-') && !str.includes('--')) {
      results.add(str);
    }
    if (chars.length === 0) break;
  }
  return Array.from(results);
}

function availabilityStatus(domain) {
  const hash = hashString(domain);
  const mod = hash % 100;
  if (mod < 50) return 'available';
  if (mod < 70) return 'taken';
  if (mod < 85) return 'premium';
  return 'marketplace';
}

async function handleGenerate(req, res, body) {
  const {
    length = 4,
    includeNumbers = false,
    lettersOnly = false,
    allowHyphen = false,
    tlds = ['.com'],
    maxResults = 250,
    random = false,
    showAll = false
  } = body;

  const chars = buildCharacters(includeNumbers, lettersOnly, allowHyphen);
  const limit = Math.min(maxResults, 750);
  const combos = random ? randomCombos(length, chars, limit, allowHyphen) : generateBaseCombos(length, chars, limit, allowHyphen);

  const records = [];
  for (const combo of combos) {
    for (const tld of tlds) {
      const domain = `${combo}${tld}`;
      const status = availabilityStatus(domain);
      const price = priceEstimate(domain);
      const keywordScore = keywordStrength(combo);
      const badge = ratingBadge(keywordScore + (status === 'premium' ? 10 : 0));
      const registrarLinks = buildRegistrarLinks(domain);
      if (showAll || status === 'available') {
        records.push({ domain, status, price, rating: badge, keywordScore, registrarLinks });
      }
      if (records.length >= limit) break;
    }
    if (records.length >= limit) break;
  }

  const config = readConfig();
  config.analytics.totalLookups += 1;
  config.analytics.lastUpdated = new Date().toISOString();
  writeConfig(config);

  sendJson(res, 200, {
    results: records,
    meta: {
      generated: combos.length * tlds.length,
      returned: records.length,
      recommendations: buildRecommendations(chars, length, tlds)
    }
  });
}

function buildRegistrarLinks(domain) {
  const config = readConfig();
  const links = {};
  Object.entries(config.affiliateLinks).forEach(([key, link]) => {
    if (!link) return;
    if (link.includes('YOUR_CODE')) {
      links[key] = link;
    } else {
      const encoded = encodeURIComponent(domain);
      links[key] = `${link}${link.includes('?') ? '&' : '?'}domain=${encoded}`;
    }
  });
  return links;
}

function buildRecommendations(chars, length, tlds) {
  const patterns = ['nova', 'hub', 'flow', 'ai', 'cloud', 'data', 'studio', 'labs'];
  const recs = [];
  for (const token of patterns) {
    const domain = `${token}${token.length < length ? token.slice(0, length - token.length) : ''}${tlds[0] || '.com'}`;
    recs.push({ suggestion: domain, reason: `Trending keyword: ${token}` });
  }
  if (chars.length) {
    recs.push({ suggestion: `${chars[0]}${chars[1] || chars[0]}-${chars[2] || chars[0]}${tlds[0] || '.com'}`, reason: 'Pattern-based hybrid' });
  }
  return recs.slice(0, 8);
}

async function handleCheck(req, res, body) {
  const { domains = [], showAll = false } = body;
  const payload = domains.map(domain => {
    const status = availabilityStatus(domain);
    const price = priceEstimate(domain);
    const keywordScore = keywordStrength(domain.split('.')[0]);
    return { domain, status, price, rating: ratingBadge(keywordScore), keywordScore, registrarLinks: buildRegistrarLinks(domain) };
  }).filter(item => showAll || item.status === 'available');
  sendJson(res, 200, { results: payload });
}

async function handleAdminGet(req, res) {
  const config = readConfig();
  sendJson(res, 200, config);
}

async function handleAdminUpdate(req, res, body) {
  const config = readConfig();
  const merged = { ...config, ...body };
  writeConfig(merged);
  sendJson(res, 200, merged);
}

function handleOptions(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return handleOptions(res);
  const parsed = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (parsed.pathname === '/api/domains/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      return handleGenerate(req, res, body);
    }
    if (parsed.pathname === '/api/domains/check' && req.method === 'POST') {
      const body = await parseBody(req);
      return handleCheck(req, res, body);
    }
    if (parsed.pathname === '/api/admin/config' && req.method === 'GET') {
      return handleAdminGet(req, res);
    }
    if (parsed.pathname === '/api/admin/config' && req.method === 'POST') {
      const body = await parseBody(req);
      return handleAdminUpdate(req, res, body);
    }
    return serveStatic(req, res);
  } catch (err) {
    console.error('Server error', err);
    sendJson(res, 500, { error: 'Internal error', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
