async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderInputs(container, data, prefix) {
  container.innerHTML = '';
  Object.entries(data).forEach(([key, value]) => {
    const label = document.createElement('label');
    label.textContent = key;
    const input = document.createElement('input');
    input.value = value;
    input.dataset.key = key;
    input.className = 'text-input';
    label.appendChild(input);
    container.appendChild(label);
  });
  container.dataset.prefix = prefix;
}

document.addEventListener('DOMContentLoaded', async () => {
  const affiliateForm = document.getElementById('affiliateForm');
  const apiForm = document.getElementById('apiForm');
  const analytics = document.getElementById('analytics');
  const status = document.getElementById('saveStatus');

  try {
    const config = await fetchJSON('/api/admin/config');
    renderInputs(affiliateForm, config.affiliateLinks, 'affiliateLinks');
    renderInputs(apiForm, config.apiProviders, 'apiProviders');
    analytics.textContent = JSON.stringify(config.analytics, null, 2);
  } catch (err) {
    analytics.textContent = err.message;
  }

  document.getElementById('saveAdmin').onclick = async () => {
    const payload = { affiliateLinks: {}, apiProviders: {} };
    affiliateForm.querySelectorAll('input').forEach(input => {
      payload.affiliateLinks[input.dataset.key] = input.value;
    });
    apiForm.querySelectorAll('input').forEach(input => {
      payload.apiProviders[input.dataset.key] = input.value;
    });

    try {
      await fetchJSON('/api/admin/config', { method: 'POST', body: JSON.stringify(payload) });
      status.textContent = 'Saved and ready. Links are now live.';
    } catch (err) {
      status.textContent = err.message;
    }
  };
});
