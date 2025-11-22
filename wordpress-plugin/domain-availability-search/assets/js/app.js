(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  let results = [];
  let lang = 'en';

  const i18n = {
    en: { ready: 'Ready to search.', loading: 'Loading...', filters: 'Filters', generate: 'Generate' },
    ar: { ready: 'جاهز للبحث', loading: 'جاري التحميل...', filters: 'فلاتر', generate: 'توليد' }
  };

  function statusBadge(status){
    return `<span class="badge ${status}">${status}</span>`;
  }

  function addToLocal(key, value, max = 15){
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const list = [value, ...current.filter(v => v !== value)].slice(0, max);
    localStorage.setItem(key, JSON.stringify(list));
  }

  function renderChips(target, key){
    const el = $(target); if(!el) return;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    el.innerHTML = '';
    list.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = item;
      chip.onclick = () => { $('#das-search').value = item.replace(/\..+$/, ''); filterResults(); };
      el.appendChild(chip);
    });
  }

  async function fetchJSON(path, payload){
    const res = await fetch(`${DomainSearchSettings.restUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': DomainSearchSettings.nonce
      },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(await res.text());
    return res.json();
  }

  function renderMeta(meta){
    $('#das-meta').textContent = `Generated ${meta.returned}/${meta.generated} combinations. ${i18n[lang].ready}`;
    const trending = $('#das-trending');
    trending.innerHTML = '';
    (meta.recommendations || []).forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = item.suggestion;
      chip.title = item.reason;
      chip.onclick = () => { $('#das-search').value = item.suggestion.replace(/\..+$/, ''); filterResults(); };
      trending.appendChild(chip);
    });
  }

  function renderTable(data){
    const tbody = $('#das-results');
    tbody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.domain}</td>
        <td>${statusBadge(row.status)}</td>
        <td>$${Number(row.price).toFixed(2)}</td>
        <td>${row.rating} · ${row.keywordScore}</td>
        <td>
          <div class="action-buttons">
            ${(row.registrarLinks ? Object.entries(row.registrarLinks).map(([name, url]) => `<a class="buy" target="_blank" href="${url}">${name}</a>`).join('') : '')}
            <button class="favorite" data-domain="${row.domain}">★</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.favorite').forEach(btn => {
      btn.onclick = () => { addToLocal('das_favorites', btn.dataset.domain); renderChips('#das-favoriteList','das_favorites'); };
    });
  }

  function filterResults(){
    const keyword = ($('#das-search').value || '').toLowerCase();
    const filtered = results.filter(r => r.domain.toLowerCase().includes(keyword));
    renderTable(filtered);
  }

  function exportData(type){
    const payload = results.map(r => ({ domain: r.domain, status: r.status, price: r.price, rating: r.rating, keywordScore: r.keywordScore }));
    if(type === 'csv'){
      const header = 'domain,status,price,rating,keywordScore\n';
      const rows = payload.map(p => `${p.domain},${p.status},${p.price},${p.rating},${p.keywordScore}`).join('\n');
      download('domains.csv', header + rows);
    } else {
      download('domains.json', JSON.stringify(payload, null, 2));
    }
  }

  function download(name, text){
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  async function generate(){
    $('#das-results').innerHTML = `<tr><td colspan="5" class="loading">${i18n[lang].loading}</td></tr>`;
    const payload = {
      length: Number($('#das-length').value),
      includeNumbers: $('#das-includeNumbers').checked,
      lettersOnly: $('#das-lettersOnly').checked,
      allowHyphen: $('#das-allowHyphen').checked,
      tlds: Array.from($('#das-tlds').selectedOptions).map(o => o.value),
      random: $('#das-random').checked,
      showAll: $('#das-showAll').checked,
      maxResults: Number($('#das-maxResults').value)
    };
    try{
      const data = await fetchJSON('/generate', payload);
      results = data.results;
      renderTable(results);
      renderMeta(data.meta || {});
      results.forEach(r => addToLocal('das_recent', r.domain));
      renderChips('#das-recentList','das_recent');
    }catch(err){
      $('#das-results').innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
    }
  }

  async function checkDomains(){
    const keywords = ($('#das-search').value || '').split(',').map(k => k.trim()).filter(Boolean);
    if(!keywords.length){ alert('Enter comma-separated domains/keywords first.'); return; }
    const domains = keywords.map(k => k.includes('.') ? k : `${k}.com`);
    const data = await fetchJSON('/check', { domains, showAll: $('#das-showAll').checked });
    results = data.results || [];
    renderTable(results);
  }

  function init(){
    const tldSelect = $('#das-tlds');
    (DomainSearchSettings.tlds || ['.com']).forEach(tld => {
      const opt = document.createElement('option'); opt.value = tld; opt.textContent = tld; opt.selected = true; tldSelect.appendChild(opt);
    });
    $('#das-maxResults').value = DomainSearchSettings.maxResults || 200;

    $('#das-generate').onclick = generate;
    $('#das-check').onclick = checkDomains;
    $('#das-search').oninput = filterResults;
    $('#das-exportCsv').onclick = () => exportData('csv');
    $('#das-exportJson').onclick = () => exportData('json');
    $('#das-toggle-theme').onclick = () => { document.querySelector('.das-app').classList.toggle('light'); };
    $('#das-toggle-language').onclick = () => { lang = lang === 'en' ? 'ar' : 'en'; $('#das-meta').textContent = i18n[lang].ready; };

    renderChips('#das-recentList','das_recent');
    renderChips('#das-favoriteList','das_favorites');
    $('#das-meta').textContent = i18n[lang].ready;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
