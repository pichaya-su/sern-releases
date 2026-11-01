// The home page: the latest release from GitHub (download link, version, notes) and the
// theme picker under the History picture. Without either, the page still works: every
// download link already points at the latest release.

const LATEST = "https://api.github.com/repos/pichaya-su/sern-releases/releases/latest";

// Lane colors of the plain themes, which Glass shares.
const LIGHT_LANES = ["#0d8a78", "#3b6fe0", "#d9480f", "#9a4fd6", "#c88a04", "#0b8fc7", "#d6336c", "#5c940d"];
const DARK_LANES = ["#3cc4ae", "#6d9bff", "#ff8a50", "#c08bff", "#f2c14e", "#4cc3f5", "#ff6b9a", "#94d35a"];
const MONO_UI = '"JetBrains Mono", "Cascadia Mono", Consolas, monospace';
const SAIRA = '"Saira", "Segoe UI Variable Text", "Segoe UI", sans-serif';

/**
 * The released themes as Settings → Appearance groups them, with their tokens from the app's
 * styles.css. Glass draws translucent panes over its backdrop.
 */
const THEMES = [
  [
    {
      id: "light", name: "Light", hint: "Soft paper, teal accent",
      bg: "#fbfbfa", surface: "#ffffff", sidebar: "#f3f3f1", frame: "#e9e8e4", border: "#e6e5e1",
      text: "#1b1b19", muted: "#585752", accent: "#0b7566", accentFg: "#ffffff", lanes: LIGHT_LANES,
    },
    {
      id: "dark", name: "Dark", hint: "Charcoal, teal accent",
      bg: "#161615", surface: "#1b1b1a", sidebar: "#121211", frame: "#0a0a09", border: "#2b2b29",
      text: "#ecebe8", muted: "#a9a8a2", accent: "#3cc4ae", accentFg: "#0b1f1b", lanes: DARK_LANES,
    },
  ],
  [
    {
      id: "glass-light", name: "Glass Light", hint: "Frosted panes, lagoon accent",
      backdrop: "linear-gradient(135deg, #8fd0d8, #b3c5ec 50%, #f1c09c)",
      bg: "#ffffff94", surface: "#ffffffad", sidebar: "#ffffff80", frame: "#ffffff57", border: "#0e3c481f",
      text: "#13222a", muted: "#3b4b52", accent: "#08636f", accentFg: "#f6fdfe", lanes: LIGHT_LANES, corners: 1.5,
    },
    {
      id: "glass-dark", name: "Glass Dark", hint: "Smoked panes, lagoon accent",
      backdrop: "linear-gradient(135deg, #0f4d59, #1c3163 55%, #553020)",
      bg: "#0e161c8f", surface: "#0e161ca8", sidebar: "#0e161c7a", frame: "#080e12a8", border: "#ffffff17",
      text: "#e6eef1", muted: "#b3c1c6", accent: "#5cd0dc", accentFg: "#05191c", lanes: DARK_LANES, corners: 1.5,
    },
  ],
  [
    {
      id: "telemetry", name: "Telemetry Dark", hint: "Graphite, yellow signal",
      bg: "#0c0c0c", surface: "#101010", sidebar: "#0a0a0a", frame: "#0a0a0a", border: "#2c2c2c",
      text: "#eaeaea", muted: "#a3a3a3", accent: "#fffa00", accentFg: "#0a0a0a",
      lanes: ["#fffa00", "#00e5ff", "#ff00f0", "#eaeaea", "#3d8bff", "#c6ff00", "#b86bff", "#8fb3cc"],
      font: MONO_UI, corners: 0,
    },
    {
      id: "telemetry-light", name: "Telemetry Light", hint: "Spec sheet, yellow highlight",
      bg: "#efefed", surface: "#f7f7f5", sidebar: "#e7e7e4", frame: "#e7e7e4", border: "#c6c6c1",
      text: "#0e0e0e", muted: "#474744", accent: "#0e0e0e", accentFg: "#fffa00",
      lanes: ["#0e0e0e", "#007a99", "#b8009c", "#666662", "#1f5fd6", "#6a6300", "#6a2fd0", "#3b6380"],
      font: MONO_UI, corners: 0, swatch: "#fffa00",
    },
  ],
  [
    {
      id: "orbit", name: "Orbit Dark", hint: "Retro console, amber phosphor",
      bg: "#11141b", surface: "#151922", sidebar: "#0d1016", frame: "#050609", border: "#272e3b",
      text: "#ece6d6", muted: "#aba596", accent: "#ffb547", accentFg: "#1c1204",
      lanes: ["#ffb547", "#5ccfe6", "#ff7a59", "#c3a6ff", "#9be37c", "#8fa8ff", "#f28fb5", "#e0c08f"],
      font: SAIRA, corners: 1.6,
    },
    {
      id: "orbit-light", name: "Orbit Light", hint: "Space-age enamel, rocket orange",
      bg: "#efede7", surface: "#f7f5f0", sidebar: "#e7e4dc", frame: "#dcd8ce", border: "#cdc8bc",
      text: "#1d1a24", muted: "#4a4652", accent: "#9e3a06", accentFg: "#fffaf2",
      lanes: ["#9e3a06", "#1f6f8b", "#a3324e", "#5a4fb5", "#6e6000", "#2a7a5b", "#b5367f", "#4d5a6b"],
      font: SAIRA, corners: 1.6,
    },
  ],
];

setUpThemes();
loadRelease();
window.hljs?.highlightAll();

function setUpThemes() {
  const app = document.getElementById("app");
  const pick = document.querySelector(".theme-pick");
  const group = pick.querySelector(".swatches");
  const label = pick.querySelector(".theme-name");
  const dark = matchMedia("(prefers-color-scheme: dark)");
  let chosen = false; // Until a swatch is picked, the picture follows the page's light or dark.

  const buttons = [];
  for (const pair of THEMES) {
    const wrap = document.createElement("div");
    wrap.className = "swatch-pair";
    for (const t of pair) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", t.name);
      b.title = `${t.name}: ${t.hint}`;
      b.style.setProperty("--a", t.backdrop || t.bg);
      b.style.setProperty("--b", t.text);
      b.style.setProperty("--c", t.swatch || t.accent);
      b.theme = t;
      b.addEventListener("click", () => select(b, true));
      wrap.append(b);
      buttons.push(b);
    }
    group.append(wrap);
  }

  group.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const at = buttons.findIndex((b) => b.getAttribute("aria-checked") === "true");
    const next = buttons[(at + step + buttons.length) % buttons.length];
    select(next, true);
    next.focus();
  });

  function select(button, apply) {
    for (const b of buttons) {
      const on = b === button;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    const t = button.theme;
    label.innerHTML = "";
    const name = document.createElement("strong");
    name.textContent = t.name;
    label.append(name, ` ${t.hint}`);
    if (!apply) return;
    chosen = true;
    const s = app.style;
    for (const [k, v] of Object.entries({
      bg: t.bg, surface: t.surface, sidebar: t.sidebar, frame: t.frame, border: t.border,
      text: t.text, muted: t.muted, accent: t.accent, "accent-fg": t.accentFg,
    })) s.setProperty(`--m-${k}`, v);
    t.lanes.forEach((c, i) => s.setProperty(`--m-l${i}`, c));
    s.setProperty("--m-font", t.font || "var(--sans)");
    s.setProperty("--m-corners", String(t.corners ?? 1));
    s.setProperty("--m-backdrop", t.backdrop || t.bg);
    s.setProperty("--m-blur", t.backdrop ? "blur(24px) saturate(1.4)" : "none");
  }

  const follow = () => chosen || select(buttons[dark.matches ? 1 : 0], false);
  dark.addEventListener("change", follow);
  follow();
  pick.hidden = false;
}

async function loadRelease() {
  let release;
  try {
    const res = await fetch(LATEST, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return;
    release = await res.json();
  } catch {
    return; // Offline or rate-limited: the links still go to the latest release page.
  }

  const version = release.tag_name.replace(/^v/, "");
  const setup = release.assets.find((a) => /^SERN-Setup-.*\.exe$/i.test(a.name));
  if (setup) {
    for (const a of document.querySelectorAll("[data-download]")) a.href = setup.browser_download_url;
  }
  const size = setup ? `, ${(setup.size / 1024 / 1024).toFixed(1)} MB` : "";
  document.querySelector("[data-version-line]").textContent = `Version ${version}${size}. `;

  const section = document.getElementById("release");
  if (!window.marked || !release.body) return;
  section.querySelector("h2").textContent = `New in ${version}`;
  const date = new Date(release.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  section.querySelector(".release-date").textContent = `Released ${date}.`;
  section.querySelector(".notes").innerHTML = marked.parse(withoutInstall(release.body));
  section.hidden = false;
}

/** The notes minus their Install section, which talks about the files below it on GitHub. */
function withoutInstall(markdown) {
  return markdown
    .split(/^(?=#{2,3} )/m)
    .filter((part) => !/^#{2,3} .*\binstall/i.test(part))
    .join("");
}
