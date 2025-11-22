const i18n = {
  en: {
    filters: 'Filters', desiredLength: 'Desired length', includeNumbers: 'Include numbers', lettersOnly: 'Letters only', allowHyphen: 'Allow hyphens', tlds: 'TLD extensions', random: 'Random suggestions', showAll: 'Show all statuses', maxResults: 'Max results', generate: 'Generate', exportCsv: 'Export CSV', exportJson: 'Export JSON', search: 'Search keywords', check: 'Check availability', recent: 'Recently viewed', favorites: 'Favorites', trending: 'Trending patterns', domain: 'Domain', availability: 'Availability', price: 'Est. price', rating: 'Rating', actions: 'Actions', buy: 'Buy now'
  },
  ar: {
    filters: 'الفلاتر', desiredLength: 'الطول المطلوب', includeNumbers: 'تشمل الأرقام', lettersOnly: 'حروف فقط', allowHyphen: 'السماح بالواصلات', tlds: 'الامتدادات', random: 'اقتراحات عشوائية', showAll: 'عرض جميع الحالات', maxResults: 'أقصى النتائج', generate: 'توليد', exportCsv: 'تصدير CSV', exportJson: 'تصدير JSON', search: 'ابحث عن الكلمات', check: 'تحقق من التوافر', recent: 'شوهد حديثاً', favorites: 'المفضلة', trending: 'الأكثر شيوعاً', domain: 'النطاق', availability: 'التوافر', price: 'السعر التقديري', rating: 'التقييم', actions: 'الإجراءات', buy: 'اشتر الآن'
  }
};

let currentLang = 'en';
let results = [];

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

function translate() {
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', currentLang === 'ar');
  const strings = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (strings[key]) el.textContent = strings[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (strings[key]) el.placeholder = strings[key];
  });
}

function statusBadge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

function addToLocal(name, value, max = 12) {
  const existing = JSON.parse(localStorage.getItem(name) || '[]');
  const filtered = [value, ...existing.filter(v => v !== value)].slice(0, max);
  localStorage.setItem(name, JSON.stringify(filtered));
}

function renderChips(id, storageKey) {
  const container = $(id);
  const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
  container.innerHTML = '';
  data.forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = item;
    chip.onclick = () => {
      $('#search').value = item;
      filterResults();
    };
    container.appendChild(chip);
  });
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderMeta(meta) {
  $('#meta').textContent = `Generated ${meta.returned}/${meta.generated} combinations. Trending ideas ready.`;
  const trending = $('#trending');
  trending.innerHTML = '';
  meta.recommendations.forEach(rec => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = rec.suggestion;
    chip.title = rec.reason;
    chip.onclick = () => {
      $('#search').value = rec.suggestion.replace(/\.[^.]+$/, '');
      filterResults();
    };
    trending.appendChild(chip);
  });
}

function renderTable(data) {
  const body = $('#resultsBody');
  body.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.domain}</td>
      <td>${statusBadge(row.status)}</td>
      <td>$${row.price.toFixed(2)}</td>
      <td class="rating">${row.rating} · ${row.keywordScore}</td>
      <td>
        <div class="action-buttons">
          ${Object.entries(row.registrarLinks || {}).map(([name, link]) => `<a class="buy" target="_blank" href="${link}">${name}</a>`).join('')}
          <button class="favorite" data-domain="${row.domain}">★</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
  body.querySelectorAll('.favorite').forEach(btn => {
    btn.onclick = () => {
      addToLocal('favorites', btn.dataset.domain);
      renderChips('#favoriteList', 'favorites');
    };
  });
}

function filterResults() {
  const keyword = $('#search').value.toLowerCase();
  const filtered = results.filter(r => r.domain.toLowerCase().includes(keyword));
  renderTable(filtered);
}

async function generate() {
  $('#resultsBody').innerHTML = `<tr><td colspan="5" class="loading">Loading...</td></tr>`;
  const payload = {
    length: Number($('#length').value),
    includeNumbers: $('#includeNumbers').checked,
    lettersOnly: $('#lettersOnly').checked,
    allowHyphen: $('#allowHyphen').checked,
    tlds: Array.from($('#tlds').selectedOptions).map(o => o.value),
    random: $('#random').checked,
    showAll: $('#showAll').checked,
    maxResults: Number($('#maxResults').value)
  };
  try {
    const data = await fetchJSON('/api/domains/generate', { method: 'POST', body: JSON.stringify(payload) });
    results = data.results;
    renderTable(results);
    renderMeta(data.meta);
    results.forEach(r => addToLocal('recent', r.domain));
    renderChips('#recentList', 'recent');
  } catch (err) {
    $('#resultsBody').innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

async function checkSelected() {
  const keywords = $('#search').value.split(',').map(k => k.trim()).filter(Boolean);
  if (!keywords.length) return alert('Add comma-separated domains or keywords.');
  const domains = keywords.map(k => k.includes('.') ? k : `${k}.com`);
  const data = await fetchJSON('/api/domains/check', { method: 'POST', body: JSON.stringify({ domains, showAll: $('#showAll').checked }) });
  results = data.results;
  renderTable(results);
}

function exportData(type) {
  const payload = results.map(r => ({ domain: r.domain, status: r.status, price: r.price, rating: r.rating, keywordScore: r.keywordScore }));
  if (type === 'csv') {
    const header = 'domain,status,price,rating,keywordScore\n';
    const rows = payload.map(p => `${p.domain},${p.status},${p.price},${p.rating},${p.keywordScore}`).join('\n');
    download('domains.csv', header + rows);
  } else {
    download('domains.json', JSON.stringify(payload, null, 2));
  }
}

function download(name, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('light', saved === 'light');
  $('#toggle-theme').onclick = () => {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
  };
}

function initLanguage() {
  const saved = localStorage.getItem('lang') || 'en';
  currentLang = saved;
  translate();
  $('#toggle-language').onclick = () => {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('lang', currentLang);
    translate();
  };
}

function initFavorites() {
  renderChips('#favoriteList', 'favorites');
  renderChips('#recentList', 'recent');
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLanguage();
  initFavorites();
  translate();
  $('#generate').onclick = generate;
  $('#checkSelected').onclick = checkSelected;
  $('#search').oninput = filterResults;
  $('#exportCsv').onclick = () => exportData('csv');
  $('#exportJson').onclick = () => exportData('json');
  generate();
});
