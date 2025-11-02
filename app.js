/* --------------------
   Data & Storage
-------------------- */
const STORAGE_KEY = 'bookmarks_v1';

function loadBookmarks(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch(e){ return []; }
}
function saveBookmarks(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function makeId(){
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function normalizeUrl(url){
  if(!url) return '';
  url = url.trim();
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

/* --------------------
   Toast
-------------------- */
const toastEl = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const toastClose = document.getElementById('toastClose');
let toastTimer = null;
function showToast(message){
  toastText.textContent = message;
  toastEl.classList.add('show');
  toastEl.setAttribute('aria-hidden','false');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 2400);
}
function hideToast(){
  toastEl.classList.remove('show');
  toastEl.setAttribute('aria-hidden','true');
}
if(toastClose) toastClose.addEventListener('click', hideToast);

/* --------------------
   UI Refs
-------------------- */
const listArea = document.getElementById('listArea');
const countEl = document.getElementById('count');
const searchInput = document.getElementById('searchInput');

const addBtn = document.getElementById('addBtn');
const siteNameEl = document.getElementById('siteName');
const siteURLEl = document.getElementById('siteURL');

/* hidden native selects (we keep them to store values & for easy fallback) */
const hiddenSiteSelect = document.getElementById('siteCategory'); // hidden native select
const hiddenFilterSelect = document.getElementById('filterCategory'); // hidden native select

/* --------------------
   Custom Select helper
   - Connects the visible custom-select to the hidden native select
-------------------- */
function setupCustomSelect({btnId, hiddenSelect, initialValue, onChange}){
  const root = document.getElementById(btnId);
  const toggle = root.querySelector('.select-toggle');
  const label = root.querySelector('.select-label');
  const icon = root.querySelector('.select-icon');
  const popup = root.querySelector('.select-options');

  // set initial label from hidden select or passed initial
  const init = initialValue || hiddenSelect.value;
  setSelected(init);

  function setSelected(val){
    // update visible label & icon
    label.textContent = val;
    // update icon depending on val
    switch(val){
      case 'Social': icon.className = 'bi bi-people-fill select-icon'; break;
      case 'Study': icon.className = 'bi bi-journal-bookmark-fill select-icon'; break;
      case 'Shopping': icon.className = 'bi bi-bag-fill select-icon'; break;
      case 'Others': icon.className = 'bi bi-grid-3x3-gap-fill select-icon'; break;
      case 'All categories': icon.className = 'bi bi-list-ul select-icon'; break;
      default: icon.className = 'bi bi-list-ul select-icon';
    }
    // sync hidden select value
    hiddenSelect.value = val;
    if(typeof onChange === 'function') onChange(val);
  }

  // click outside to close
  document.addEventListener('click', (e) => {
    if(!root.contains(e.target)) { root.setAttribute('aria-expanded','false'); popup.style.display='none'; }
  });

  // toggle click
  toggle.addEventListener('click', (e) => {
    const open = root.getAttribute('aria-expanded') === 'true';
    if(open){ root.setAttribute('aria-expanded','false'); popup.style.display='none'; }
    else { root.setAttribute('aria-expanded','true'); popup.style.display='block'; }
  });

  // keyboard support
  root.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
    if(e.key === 'Escape') { root.setAttribute('aria-expanded','false'); popup.style.display='none'; }
  });

  // option clicks
  popup.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const v = li.getAttribute('data-value');
      setSelected(v);
      popup.style.display = 'none';
      root.setAttribute('aria-expanded','false');
    });
  });

  // expose method
  return { setSelected };
}

/* --------------------
   Helpers
-------------------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]); }
function truncateUrl(u){
  if(!u) return '';
  const clean = u.replace(/^https?:\/\//i,'').replace(/\/$/,'');
  return clean.length > 36 ? clean.slice(0,36) + '…' : clean;
}
function categoryClass(cat){
  if(!cat) return '';
  const map = {'Social':'cat-social','Study':'cat-study','Shopping':'cat-shopping','Others':'cat-others'};
  return map[cat] || '';
}

/* --------------------
   Rendering
-------------------- */
function render(){
  const all = loadBookmarks();
  const q = (searchInput.value || '').trim().toLowerCase();
  const cat = hiddenFilterSelect.value;

  const filtered = all.filter(b => {
    const matchName = (b.name||'').toLowerCase().includes(q);
    const matchCat = (cat === 'All categories') || (b.cat === cat);
    return matchName && matchCat;
  });

  countEl.textContent = all.length || 0;

  if(!filtered.length){
    listArea.innerHTML = `
      <div class="empty">
        <div style="font-weight:600; margin-bottom:8px;">No bookmarks found</div>
        <div style="font-size:13px; color:var(--muted);">Try adding one or change your search / filter.</div>
      </div>
    `;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';

  filtered.forEach(b => {
    const node = renderCard(b);
    grid.appendChild(node);
  });

  listArea.innerHTML = '';
  listArea.appendChild(grid);
}

/* render a single card node */
function renderCard(b){
  const card = document.createElement('div');
  card.className = 'card';

  // favicon src via google s2 (domain)
  let faviconSrc = '';
  try {
    const d = new URL(b.url);
    faviconSrc = `https://www.google.com/s2/favicons?domain=${d.hostname}&sz=64`;
  } catch(e) {
    faviconSrc = '';
  }

  // category icon (mono bootstrap icon mapping)
  const catIconMap = {
    'Social': 'bi bi-people',
    'Study': 'bi bi-journal-bookmark',
    'Shopping': 'bi bi-bag',
    'Others': 'bi bi-grid-3x3-gap' // fallback
  };
  const catIconClass = catIconMap[b.cat] || 'bi bi-list-ul';

  // first letter fallback
  const first = (b.name || '').trim().charAt(0).toUpperCase() || '?';

  // build innerHTML
  card.innerHTML = `
    <div class="cat-icon" title="${escapeHtml(b.cat || '')}"><i class="${catIconClass}"></i></div>

    <div class="title">
      <div class="favicon" aria-hidden="true">
        ${ faviconSrc ? `<img src="${faviconSrc}" alt="${escapeHtml(b.name)} favicon" onerror="this.style.display='none'; this.parentNode.textContent='${escapeHtml(first)}';" />`
                       : escapeHtml(first) }
      </div>

      <div class="meta">
        <div class="name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>
        <div class="url" title="${escapeHtml(b.url)}">${truncateUrl(b.url)}</div>
      </div>
    </div>

    <div style="height:6px;"></div>

    <div class="actions">
      <button class="open-btn">Open</button>
      <button class="delete-btn" title="Delete"><i class="bi bi-trash3"></i></button>
    </div>
  `;

  // wiring actions
  const openBtn = card.querySelector('.open-btn');
  const delBtn = card.querySelector('.delete-btn');

  openBtn.addEventListener('click', () => {
    try { window.open(b.url, '_blank'); } catch(e){ window.location.href = b.url; }
  });

  delBtn.addEventListener('click', () => deleteBookmark(b.id));

  return card;
}

/* --------------------
   Actions
-------------------- */
function handleAdd(){
  const name = (siteNameEl.value || '').trim();
  const urlRaw = (siteURLEl.value || '').trim();
  const category = (hiddenSiteSelect.value || 'Social').trim();

  if(!name){ showToast('Please enter a website name'); siteNameEl.focus(); return; }
  if(!urlRaw){ showToast('Please enter a URL'); siteURLEl.focus(); return; }

  const url = normalizeUrl(urlRaw);
  try { new URL(url); } catch(e){ showToast('Invalid URL'); siteURLEl.focus(); return; }

  const arr = loadBookmarks();
  const bookmark = { id: makeId(), name, url, cat: category, createdAt: Date.now() }; // note: 'cat' property
  arr.unshift(bookmark);
  saveBookmarks(arr);

  siteNameEl.value = '';
  siteURLEl.value = '';
  // reset site category to default Social
  hiddenSiteSelect.value = 'Social';
  siteCategoryComponent.setSelected('Social');

  showToast('Bookmark added');
  render();
}

function deleteBookmark(id){
  let arr = loadBookmarks();
  arr = arr.filter(b => b.id !== id);
  saveBookmarks(arr);
  showToast('Bookmark deleted');
  render();
}

/* --------------------
   Init + wiring
-------------------- */
let siteCategoryComponent, filterCategoryComponent;

(function init(){
  // setup custom selects (connect visible custom UI with hidden native selects)
  siteCategoryComponent = setupCustomSelect({
    btnId: 'siteCategoryBtn',
    hiddenSelect: hiddenSiteSelect,
    initialValue: hiddenSiteSelect.value,
    onChange: (v) => { /* nothing extra */ }
  });

  filterCategoryComponent = setupCustomSelect({
    btnId: 'filterCategoryBtn',
    hiddenSelect: hiddenFilterSelect,
    initialValue: hiddenFilterSelect.value,
    onChange: (v) => { render(); }
  });

  // DOM events
  addBtn.addEventListener('click', handleAdd);
  siteURLEl.addEventListener('keydown', (e)=> { if(e.key === 'Enter') handleAdd(); });
  siteNameEl.addEventListener('keydown', (e)=> { if(e.key === 'Enter') handleAdd(); });

  searchInput.addEventListener('input', debounce(render, 160));
  hiddenFilterSelect.addEventListener('change', render);

  // first render
  render();
})();

/* --------------------
   Debounce util
-------------------- */
function debounce(fn, wait){
  let t = null;
  return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), wait); };
}