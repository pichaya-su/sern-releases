// The docs: renders the files in docs/ into this page, so it always shows what the repository
// has (each release refreshes the plugin docs there). Pages are picked with ?p=<id>.

const REPO = "https://github.com/pichaya-su/sern-releases";

const PAGES = {
  guide: { title: "Guide", file: "docs/guide.md" },
  plugins: { title: "Writing plugins", file: "docs/plugins.md" },
  "agent-guide": { title: "API guide for AI agents", file: "docs/plugins/PLUGIN_AGENT_GUIDE.md" },
  types: { title: "TypeScript types", file: "docs/plugins/sern.d.ts", render: typesPage },
  examples: { title: "Examples", file: "docs/plugins", render: examplesPage },
};

/** The example plugins in docs/plugins, in the order the plugin guide introduces them. */
const EXAMPLES = ["commit-link", "jira-issues", "run-script"];

/** Where a command shows up, by its scope (as in docs/plugins.md). */
const SCOPES = {
  app: "The command palette, even with no repository open",
  "new-tab": "The new tab menu (+), the welcome page and the palette",
  repo: "The repository menu and the palette",
  commit: "A commit's right-click menu in History",
  branch: "A branch's right-click menu in the sidebar",
  file: "The right-click menu of changed files",
};

const doc = document.getElementById("doc");
const foot = document.querySelector(".doc-foot");
const source = document.getElementById("source");
const tocBox = document.querySelector(".docs-toc");
const toc = document.getElementById("toc");
const navToggle = document.querySelector(".nav-toggle");
let current = null;
let headings = [];

navToggle.addEventListener("click", () => {
  navToggle.setAttribute("aria-expanded", String(navToggle.getAttribute("aria-expanded") !== "true"));
});

// Links to another page here load it in place instead of reloading the whole page.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.target || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || !url.searchParams.has("p")) return;
  e.preventDefault();
  if (url.href !== location.href) history.pushState(null, "", url);
  navToggle.setAttribute("aria-expanded", "false");
  show();
});
addEventListener("popstate", show);
addEventListener("scroll", () => requestAnimationFrame(markSection), { passive: true });

show();

async function show() {
  const id = new URLSearchParams(location.search).get("p") || "guide";
  if (id === current) return scrollToHash();
  current = id;
  const page = PAGES[id];

  for (const a of document.querySelectorAll(".nav-list a[data-page]")) {
    if (a.dataset.page === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  document.querySelector("[data-current]").textContent = page ? page.title : "Pages";

  if (!page) {
    finish({ title: "Page not found" }, `<h1>Page not found</h1><p>There's no page called “${escape(id)}”. Pick one from the list, or start with the <a href="?p=guide">guide</a>.</p>`);
    return;
  }

  doc.innerHTML = `<h1>${escape(page.title)}</h1><p class="doc-status">Loading…</p>`;
  let html;
  try {
    html = page.render ? await page.render(page) : markdown(await fetchText(page.file));
  } catch (err) {
    html = `<h1>${escape(page.title)}</h1><p class="doc-status">This page didn't load (${escape(err.message)}). <a href="${REPO}/blob/main/${page.file}">Read it on GitHub</a> instead.</p>`;
  }
  if (current === id) finish(page, html);
}

/** Puts a rendered page in place: section links, links between docs, code colors and the outline. */
function finish(page, html) {
  doc.innerHTML = html;
  document.title = `${page.title} | SERN docs`;

  const used = new Set();
  headings = [...doc.querySelectorAll("h2, h3, h4")];
  for (const h of headings) {
    h.id ||= slug(h.textContent, used);
    h.dataset.title = h.textContent;
    const a = document.createElement("a");
    a.className = "anchor";
    a.href = `#${h.id}`;
    a.setAttribute("aria-label", `Link to “${h.textContent}”`);
    a.textContent = "#";
    h.append(a);
  }

  // Markdown links are relative to the file, as on GitHub; point them at the pages here.
  if (!page.render && page.file) {
    for (const a of doc.querySelectorAll("a[href]")) a.setAttribute("href", docLink(a.getAttribute("href"), page.file));
  }
  for (const table of doc.querySelectorAll("table")) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.replaceWith(wrap);
    wrap.append(table);
  }
  for (const code of doc.querySelectorAll("pre code[class*='language-']")) {
    const lang = code.className.match(/language-(\S+)/)[1];
    if (window.hljs?.getLanguage(lang)) hljs.highlightElement(code);
  }

  const sections = headings.filter((h) => h.tagName !== "H4");
  toc.innerHTML = sections
    .map((h) => `<li${h.tagName === "H3" ? ' class="sub"' : ""}><a href="#${h.id}">${escape(h.dataset.title)}</a></li>`)
    .join("");
  tocBox.hidden = sections.length < 2;

  foot.hidden = !page.file;
  if (page.file) source.href = `${REPO}/${page.render === examplesPage ? "tree" : "blob"}/main/${page.file}`;

  scrollToHash();
}

function scrollToHash() {
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView();
  else scrollTo(0, 0);
  markSection();
}

/** Marks the section being read in the outline. */
function markSection() {
  let on = null;
  for (const h of headings) {
    if (h.getBoundingClientRect().top > 120) break;
    on = h;
  }
  for (const a of toc.querySelectorAll("a")) {
    if (on && a.hash === `#${on.id}`) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
}

/** Where a Markdown link from `from` should go: a page here, or the file on GitHub. */
function docLink(href, from) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\?|\/)/i.test(href)) return href;
  const [path, hash] = href.split("#");
  const frag = hash ? `#${hash}` : "";
  const target = new URL(path, `https://x/${from}`).pathname.slice(1).replace(/\/$/, "");
  const page = Object.entries(PAGES).find(([, p]) => p.file === target);
  if (page) return `?p=${page[0]}${frag}`;
  const example = EXAMPLES.find((e) => target === `docs/plugins/${e}` || target.startsWith(`docs/plugins/${e}/`));
  if (example) return `?p=examples#${example}`;
  return `${REPO}/${/\.[a-z0-9]+$/i.test(target) ? "blob" : "tree"}/main/${target}${frag}`;
}

function markdown(text) {
  if (!window.marked) throw new Error("the Markdown renderer didn't load");
  return marked.parse(text, { gfm: true });
}

async function typesPage(page) {
  const code = await fetchText(page.file);
  return `
    <h1>TypeScript types</h1>
    <p>The plugin API's types, for completion and checks in your editor. Save
      <a href="${page.file}" download>sern.d.ts</a> next to your plugin's <code>main.js</code> and start the script
      with <code>/// &lt;reference path="sern.d.ts" /&gt;</code>. The <a href="?p=plugins">plugin guide</a> explains
      each call.</p>
    <pre><code class="language-typescript">${escape(code)}</code></pre>`;
}

async function examplesPage() {
  const parts = await Promise.all(EXAMPLES.map(examplePart));
  return `
    <h1>Examples</h1>
    <p>Three plugins that show the API at work. To try one, copy its folder to your computer and install it with
      <strong>Settings → Plugins → From folder…</strong>. The <a href="?p=plugins">plugin guide</a> explains the
      manifest and every call they make.</p>
    ${parts.join("")}`;
}

async function examplePart(name) {
  const dir = `docs/plugins/${name}`;
  const folder = `<p><a href="${REPO}/tree/main/${dir}">Browse the ${escape(name)} folder on GitHub</a></p>`;
  let manifestText, main, m;
  try {
    [manifestText, main] = await Promise.all([fetchText(`${dir}/sern-plugin.json`), fetchText(`${dir}/main.js`)]);
    m = JSON.parse(manifestText);
  } catch (err) {
    return `<h2 id="${name}">${escape(name)}</h2><p class="doc-status">This example didn't load (${escape(err.message)}).</p>${folder}`;
  }

  const code = (s) => `<code>${escape(s)}</code>`;
  const facts = [["Permissions", (m.permissions ?? []).map(code).join(" ") || "None"]];
  if (m.network?.length) facts.push(["Web hosts", m.network.map(code).join(" ")]);
  const scripts = Object.values(m.scripts ?? {}).map((s) => {
    const path = typeof s === "string" ? s : s.path;
    return `<a href="${REPO}/blob/main/${dir}/${path}">${code(path)}</a>${s.admin ? " (as administrator)" : ""}`;
  });
  if (scripts.length) facts.push(["Scripts", scripts.join(", ")]);

  const commands = (m.contributes?.commands ?? [])
    .map((c) => `<tr><td>${escape(c.title)}</td><td>${SCOPES[c.scope ?? "repo"] ?? code(c.scope)}</td></tr>`)
    .join("");
  const file = (label, text, lang) =>
    `<details class="file"><summary>${label}<span>${text.trimEnd().split("\n").length} lines</span></summary><pre><code class="language-${lang}">${escape(text)}</code></pre></details>`;

  return `
    <h2 id="${name}">${escape(m.name)}</h2>
    <p>${escape(m.description ?? "")}</p>
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <table><thead><tr><th>Command</th><th>Shows up in</th></tr></thead><tbody>${commands}</tbody></table>
    ${file("sern-plugin.json", manifestText, "json")}
    ${file("main.js", main, "javascript")}
    ${folder}`;
}

async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return res.text();
}

/** GitHub's heading ids: lowercase, punctuation dropped, spaces to dashes, repeats numbered. */
function slug(text, used) {
  const base = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
  let id = base;
  for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
