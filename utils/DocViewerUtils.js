/**
 * @file DocViewerUtils.js
 * @description Shared utility for fetching and rendering Markdown content files
 *              used by the in-game Help/FAQ and Release Notes doc viewer.
 *
 *              Supports a subset of Markdown:
 *                - # ## ### headings
 *                - **bold**, *italic*, `inline code`
 *                - - bullet lists
 *                - > blockquotes
 *                - --- horizontal rules
 *                - | tables (with header row)
 *                - blank lines as spacing
 *
 * @usage Imported by TownScreen.js, BattleMapUI.js, HousingScreen.js.
 *        Call fetchDoc(path) to load+cache, renderMarkdown(text) to convert to HTML.
 * @dependencies None — vanilla JS only
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-06): Initial implementation. Fetch cache + Markdown renderer.
 */

// ── In-memory cache so each file is only fetched once per session ──────────
const _docCache = {};

/**
 * Fetch a text file from the given path and cache it in memory.
 * Returns the raw text content.
 * @param {string} path - Relative path from game root, e.g. './data/HELP_FAQ.md'
 * @returns {Promise<string>}
 */
export async function fetchDoc(path) {
    if (_docCache[path]) return _docCache[path];
    const res = await fetch(path);
    if (!res.ok) throw new Error(`[DocViewer] Failed to load "${path}" (${res.status})`);
    const text = await res.text();
    _docCache[path] = text;
    return text;
}

// ── Inline formatter (bold, italic, code) ───────────────────────────────────
function inlineFmt(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="doc-inline-code">$1</code>');
}

/**
 * Convert a Markdown string to an HTML string using game-themed CSS classes.
 * The output is intended to be placed inside a .doc-viewer container.
 * @param {string} md - Raw Markdown text
 * @returns {string} HTML string
 */
export function renderMarkdown(md) {
    const lines = md.split('\n');
    let html = '';
    let inList = false;
    let inTable = false;
    let tableHeaderWritten = false;

    const closeList  = () => { if (inList)  { html += '</ul>';                        inList = false; } };
    const closeTable = () => { if (inTable) { html += '</tbody></table>';              inTable = false; tableHeaderWritten = false; } };

    for (let i = 0; i < lines.length; i++) {
        const raw  = lines[i];
        const line = raw.trimEnd();

        // ── Tables ──────────────────────────────────────────────────────────
        if (line.trim().startsWith('|')) {
            closeList();
            // Skip separator rows like |---|:---|
            if (/^\|[\s\-|:]+\|$/.test(line.trim())) continue;

            if (!inTable) {
                html += '<table class="doc-table"><thead>';
                inTable = true;
                tableHeaderWritten = false;
            }

            const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());

            if (!tableHeaderWritten) {
                html += `<tr>${cells.map(c => `<th>${inlineFmt(c)}</th>`).join('')}</tr></thead><tbody>`;
                tableHeaderWritten = true;
            } else {
                html += `<tr>${cells.map(c => `<td>${inlineFmt(c)}</td>`).join('')}</tr>`;
            }
            continue;
        }

        closeTable();

        // ── Blank line ───────────────────────────────────────────────────────
        if (line.trim() === '') {
            closeList();
            continue; // let CSS margin handle spacing
        }

        // ── Headings ─────────────────────────────────────────────────────────
        if (line.startsWith('### ')) {
            closeList();
            html += `<h4 class="doc-h4">${inlineFmt(line.slice(4))}</h4>`;
            continue;
        }
        if (line.startsWith('## ')) {
            closeList();
            html += `<h3 class="doc-h3">${inlineFmt(line.slice(3))}</h3>`;
            continue;
        }
        if (line.startsWith('# ')) {
            closeList();
            html += `<h2 class="doc-h2">${inlineFmt(line.slice(2))}</h2>`;
            continue;
        }

        // ── Horizontal rule ───────────────────────────────────────────────────
        if (/^---+$/.test(line.trim())) {
            closeList();
            html += '<hr class="doc-hr">';
            continue;
        }

        // ── Blockquote ────────────────────────────────────────────────────────
        if (line.startsWith('> ')) {
            closeList();
            html += `<blockquote class="doc-blockquote">${inlineFmt(line.slice(2))}</blockquote>`;
            continue;
        }

        // ── Unordered list item ───────────────────────────────────────────────
        const listMatch = line.match(/^(\s*)[-*] (.+)$/);
        if (listMatch) {
            if (!inList) { html += '<ul class="doc-list">'; inList = true; }
            html += `<li>${inlineFmt(listMatch[2])}</li>`;
            continue;
        }

        // ── Paragraph ─────────────────────────────────────────────────────────
        closeList();
        html += `<p class="doc-p">${inlineFmt(line)}</p>`;
    }

    // Close any still-open blocks
    closeList();
    closeTable();

    return html;
}
