<div class="das-app">
  <div class="das-header">
    <h2>Domain Availability Search</h2>
    <div class="das-actions">
      <button id="das-toggle-theme">Toggle theme</button>
      <button id="das-toggle-language">EN/AR</button>
    </div>
  </div>
  <div class="das-grid">
    <aside class="das-sidebar">
      <h3>Filters</h3>
      <label>Desired length <input id="das-length" type="number" min="2" max="12" value="4"></label>
      <label><input type="checkbox" id="das-includeNumbers" /> Include numbers</label>
      <label><input type="checkbox" id="das-lettersOnly" checked /> Letters only</label>
      <label><input type="checkbox" id="das-allowHyphen" /> Allow hyphens</label>
      <label>TLD extensions
        <select id="das-tlds" multiple></select>
      </label>
      <label><input type="checkbox" id="das-random" /> Random suggestions</label>
      <label><input type="checkbox" id="das-showAll" /> Show all statuses</label>
      <label>Max results <input id="das-maxResults" type="number" min="10" max="5000" value="200"></label>
      <button id="das-generate">Generate</button>
    </aside>
    <main class="das-main">
      <div class="das-bar">
        <input id="das-search" type="text" placeholder="Search keywords or comma-separated domains" />
        <button id="das-check">Check availability</button>
        <button id="das-exportCsv">Export CSV</button>
        <button id="das-exportJson">Export JSON</button>
      </div>
      <div class="das-meta" id="das-meta">Ready to search.</div>
      <div class="das-chips">
        <div>
          <h4>Recently viewed</h4>
          <div id="das-recentList" class="chip-row"></div>
        </div>
        <div>
          <h4>Favorites</h4>
          <div id="das-favoriteList" class="chip-row"></div>
        </div>
        <div>
          <h4>Trending</h4>
          <div id="das-trending" class="chip-row"></div>
        </div>
      </div>
      <table class="das-table">
        <thead>
          <tr><th>Domain</th><th>Status</th><th>Price</th><th>Rating</th><th>Actions</th></tr>
        </thead>
        <tbody id="das-results"></tbody>
      </table>
    </main>
  </div>
</div>
