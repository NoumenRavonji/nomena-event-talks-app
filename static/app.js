/* ── app.js – BigQuery Release Notes viewer ── */

'use strict';

/* ─────────────────────────────────────────────
   Animated particle background
───────────────────────────────────────────── */
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  const COLOURS = ['rgba(66,133,244,', 'rgba(0,194,255,', 'rgba(52,168,83,', 'rgba(168,85,247,'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle() {
    const col = COLOURS[Math.floor(Math.random() * COLOURS.length)];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      a: Math.random() * 0.35 + 0.05,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      col,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 120 }, mkParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.col + p.a + ')';
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();

/* ─────────────────────────────────────────────
   DOM refs
───────────────────────────────────────────── */
const refreshBtn      = document.getElementById('refreshBtn');
const refreshIcon     = document.getElementById('refreshIcon');
const exportBtn       = document.getElementById('exportBtn');
const themeToggle     = document.getElementById('themeToggle');
const feedList        = document.getElementById('feedList');
const skeletonList    = document.getElementById('skeletonList');
const emptyState      = document.getElementById('emptyState');
const errorBanner     = document.getElementById('errorBanner');
const errorMsg        = document.getElementById('errorMsg');
const searchInput     = document.getElementById('searchInput');
const filterChips     = document.querySelectorAll('.chip');
const entryBadge      = document.getElementById('entryBadge');
const metaFetchedAt   = document.getElementById('metaFetchedAt');
const metaFeedUpdated = document.getElementById('metaFeedUpdated');
const metaEntryCount  = document.getElementById('metaEntryCount');

const tweetModal   = document.getElementById('tweetModal');
const tweetText    = document.getElementById('tweetText');
const charCountEl  = document.getElementById('charCount');
const modalClose   = document.getElementById('modalClose');
const modalCancel  = document.getElementById('modalCancel');
const tweetSubmit  = document.getElementById('tweetSubmit');
const sourceLink   = document.getElementById('sourceLink');

/* ─────────────────────────────────────────────
   State
───────────────────────────────────────────── */
let allEntries    = [];
let activeFilter  = 'all';
let searchQuery   = '';

/* ─────────────────────────────────────────────
   Theme toggle (dark ⇔ light)
───────────────────────────────────────────── */
(function initTheme() {
  const saved = localStorage.getItem('bq-theme');
  if (saved === 'light') document.body.classList.add('light-theme');
})();

themeToggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('bq-theme', isLight ? 'light' : 'dark');
});

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function fmtDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoStr; }
}

/**
 * Extract distinct types (h3 text) from an entry's HTML content.
 * Returns array like ['Feature', 'Issue']
 */
function extractTypes(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const types = new Set();
  tmp.querySelectorAll('h3').forEach(h => types.add(h.textContent.trim()));
  return [...types];
}

function typeToCssClass(type) {
  const map = {
    'feature':      'feature',
    'announcement': 'announcement',
    'deprecation':  'deprecation',
    'issue':        'issue',
    'fix':          'fix',
    'fixed':        'fix',
    'changed':      'changed',
    'change':       'changed',
    'security':     'security',
    'breaking':     'breaking',
  };
  return map[type.toLowerCase()] || 'default';
}

function typeToH3Class(type) {
  const cls = typeToCssClass(type);
  return 'type-' + cls;
}

/**
 * Post-process content HTML so that h3 tags get colour classes
 * and the content is rendered cleanly.
 */
function processContentHtml(rawHtml) {
  const tmp = document.createElement('div');
  tmp.innerHTML = rawHtml;
  tmp.querySelectorAll('h3').forEach(h => {
    const cls = typeToH3Class(h.textContent.trim());
    h.classList.add(cls);
  });
  return tmp.innerHTML;
}

/* ─────────────────────────────────────────────
   Render
───────────────────────────────────────────── */
function getFilteredEntries() {
  let list = allEntries;

  if (activeFilter !== 'all') {
    list = list.filter(e =>
      extractTypes(e.content_html).some(t => t.toLowerCase() === activeFilter.toLowerCase())
    );
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(e => {
      const plain = e.tweet_preview.toLowerCase();
      const title = e.title.toLowerCase();
      return plain.includes(q) || title.includes(q);
    });
  }

  return list;
}

function buildCardEl(entry) {
  const types = extractTypes(entry.content_html);
  const card  = document.createElement('article');
  card.className = 'entry-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  const badgesHtml = types.map(t =>
    `<span class="type-badge ${typeToCssClass(t)}">${t}</span>`
  ).join('');

  const processedContent = processContentHtml(entry.content_html);

  card.innerHTML = `
    <div class="card-header">
      <div class="card-header-left">
        <span class="card-date">${entry.title}</span>
        <div class="type-badges">${badgesHtml}</div>
      </div>
      <div class="card-header-right">
        <span class="expand-toggle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
    </div>
    <p class="card-preview">${entry.tweet_preview}</p>
    <div class="card-content">
      <div class="card-content-inner">${processedContent}</div>
      <div class="card-footer">
        <a class="btn-source-link" href="${entry.link}" target="_blank" rel="noopener">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View on cloud.google.com
        </a>
        <div class="card-footer-buttons">
          <button class="btn-copy-card" data-entry-id="${encodeURIComponent(entry.id)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="btn-copy-text">Copy note</span>
          </button>
          <button class="btn-tweet-card" data-entry-id="${encodeURIComponent(entry.id)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L2.25 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
            Share on X
          </button>
        </div>
      </div>
    </div>`;

  // Toggle expand
  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn-tweet-card') || e.target.closest('.btn-source-link') || e.target.closest('.btn-copy-card')) return;
    card.classList.toggle('expanded');
  });
  card.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button, a')) {
      e.preventDefault();
      card.classList.toggle('expanded');
    }
  });

  // Tweet button
  const tweetBtn = card.querySelector('.btn-tweet-card');
  tweetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openTweetModal(entry);
  });

  // Copy button
  const copyBtn = card.querySelector('.btn-copy-card');
  const copyTextSpan = copyBtn.querySelector('.btn-copy-text');
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = entry.content_html;
    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
    const copyString = `${entry.title}\n\n${plainText}`;
    
    navigator.clipboard.writeText(copyString).then(() => {
      copyBtn.classList.add('copied');
      copyTextSpan.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyTextSpan.textContent = 'Copy note';
      }, 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  });

  return card;
}

function renderEntries() {
  const filtered = getFilteredEntries();

  feedList.innerHTML = '';
  emptyState.style.display = 'none';

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    entryBadge.textContent = '0 entries';
    return;
  }

  entryBadge.textContent = `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`;

  const frag = document.createDocumentFragment();
  filtered.forEach(e => frag.appendChild(buildCardEl(e)));
  feedList.appendChild(frag);
}

/* ─────────────────────────────────────────────
   Fetch
───────────────────────────────────────────── */
async function loadFeed() {
  setLoading(true);
  hideError();

  try {
    const resp = await fetch('/api/release-notes');
    const json = await resp.json();

    if (!json.success) throw new Error(json.error || 'Unknown server error');

    allEntries = json.data.entries;
    metaFetchedAt.textContent   = fmtDate(json.data.fetched_at);
    metaFeedUpdated.textContent = fmtDate(json.data.feed_updated);
    metaEntryCount.textContent  = `${allEntries.length}`;

    renderEntries();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  refreshBtn.disabled = loading;
  if (loading) {
    refreshIcon.classList.add('spinning');
    feedList.style.display = 'none';
    skeletonList.style.display = 'flex';
    emptyState.style.display = 'none';
  } else {
    refreshIcon.classList.remove('spinning');
    skeletonList.style.display = 'none';
    feedList.style.display = 'flex';
  }
}

function showError(msg) {
  errorBanner.style.display = 'flex';
  errorMsg.textContent = msg;
}
function hideError() {
  errorBanner.style.display = 'none';
}

/* ─────────────────────────────────────────────
   Filter chips
───────────────────────────────────────────── */
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    renderEntries();
  });
});

/* ─────────────────────────────────────────────
   Search
───────────────────────────────────────────── */
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim();
    renderEntries();
  }, 220);
});

/* ─────────────────────────────────────────────
   Refresh button
───────────────────────────────────────────── */
refreshBtn.addEventListener('click', loadFeed);

/* ─────────────────────────────────────────────
   Export CSV button
───────────────────────────────────────────── */
exportBtn.addEventListener('click', () => {
  const filtered = getFilteredEntries();
  if (!filtered.length) return;

  const headers = ['ID', 'Title/Date', 'Link', 'Types', 'Summary', 'Full Content'];
  const formatCSVCell = (val) => {
    if (val === null || val === undefined) return '';
    let formatted = String(val).replace(/"/g, '""');
    return `"${formatted}"`;
  };

  const rows = filtered.map(e => {
    const types = extractTypes(e.content_html).join(', ');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = e.content_html;
    const fullContent = (tempDiv.textContent || tempDiv.innerText || '').trim();

    return [
      e.id,
      e.title,
      e.link,
      types,
      e.tweet_preview,
      fullContent
    ].map(formatCSVCell).join(',');
  });

  const csvString = [headers.map(formatCSVCell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

/* ─────────────────────────────────────────────
   Tweet modal
───────────────────────────────────────────── */
function openTweetModal(entry) {
  const types = extractTypes(entry.content_html);
  const typeLabel = types.length ? types[0] : 'Update';
  const draft = `🚀 BigQuery ${typeLabel} (${entry.title})\n\n${entry.tweet_preview.slice(0, 180)}…\n\n${entry.link}\n\n#BigQuery #GoogleCloud #DataEngineering`;

  tweetText.value = draft.slice(0, 280);
  updateCharCount();
  sourceLink.href = entry.link;
  tweetModal.style.display = 'flex';
  tweetText.focus();
  tweetText.setSelectionRange(0, 0);
}

function closeTweetModal() {
  tweetModal.style.display = 'none';
}

function updateCharCount() {
  const len = tweetText.value.length;
  charCountEl.textContent = len;
  const row = charCountEl.closest('.char-count');
  row.classList.remove('warning', 'danger');
  if (len > 260) row.classList.add('danger');
  else if (len > 220) row.classList.add('warning');
}

tweetText.addEventListener('input', updateCharCount);

modalClose.addEventListener('click', closeTweetModal);
modalCancel.addEventListener('click', closeTweetModal);

tweetModal.addEventListener('click', (e) => {
  if (e.target === tweetModal) closeTweetModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTweetModal();
});

tweetSubmit.addEventListener('click', () => {
  const text = encodeURIComponent(tweetText.value);
  const url  = `https://twitter.com/intent/tweet?text=${text}`;
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=450');
  closeTweetModal();
});

/* ─────────────────────────────────────────────
   Init
───────────────────────────────────────────── */
loadFeed();
