# Guide for AI agents: writing a SERN plugin

You are writing a plugin for **SERN**, a Git desktop app for Windows. This file is the complete contract. Follow it
exactly; anything not listed here is not available. Types: [sern.d.ts](sern.d.ts). Human guide:
[../plugins.md](../plugins.md). Working examples: [commit-link/](commit-link) (reads the repo, opens links) and
[jira-issues/](jira-issues) (calls a web API with a saved token).

## 1. What a plugin is

A folder with exactly two required files:

```
my-plugin/
  sern-plugin.json   ← manifest
  main.js            ← ONE classic script (no import/export, no modules)
```

- SERN runs `main.js` inside a **Web Worker** sandbox. There is no `window`, no `document`, no DOM, no Node.js,
  no `require`, no `import`.
- The only way to do anything is the global **`sern`** object. Every `sern.*` call returns a Promise.
- A plugin adds **commands**. A command appears in the palette or in a right-click menu, and runs your handler.
  Plugins cannot add panels, views, buttons, keyboard shortcuts or settings pages. For input they get prompts,
  choices, confirmations and **form dialogs** (dropdowns, text boxes, checkboxes and more; section 5), all drawn
  by SERN. There is no custom HTML.
- It's shared as a **`.sernx` file**: a zip of the folder, with `sern-plugin.json` at the zip's root (or in one
  top folder).

## 2. Before writing code: decide

1. **Which commands, and the scope of each one.** The scope decides where the command shows up and what context
   the handler gets:

   | `scope` | Shows up in | Handler gets |
   |---|---|---|
   | `app` | command palette, even with no repository open (sign in, settings…) | `repo`, `branch`, `head`; all `null` with no repository open |
   | `new-tab` | new tab menu (+) and welcome page, after Open and Clone; command palette; even with no repository open (pick a repository, then `sern.repo.open`) | as `app` |
   | `repo` (default) | repository menu, command palette | `repo`, `branch`, `head` |
   | `commit` | right-click a commit in History; the palette while a commit is open | plus `commit` |
   | `branch` | right-click a branch in the sidebar (never the palette) | plus `targetBranch` |
   | `file` | right-click changed files; the palette while a file is selected | plus `files` |

2. **The smallest set of permissions.** Each one is shown to the user before install:

   | Permission | Unlocks | Risk |
   |---|---|---|
   | (none) | `commands`, `ui`, `storage`, `events` | – |
   | `repo` | `sern.repo.*` (read status, branches, history, remote URL) | low |
   | `git` | `sern.git.run(args)` (any allowed git command, including writes and push) | **high** |
   | `actions` | `sern.actions.list()`, `sern.actions.run(name)` (the user's own Repository custom actions) | **high** |
   | `scripts` | `sern.scripts.run(name, …)` (the `.ps1`/`.bat`/`.cmd` scripts listed in the manifest's `scripts`) | **high** |
   | `network` | `sern.http.fetch(url, …)` to the hosts listed in the manifest's `network` (https only) | **high** |
   | `open-url` | `sern.env.openUrl(url)` (http/https) | low |
   | `clipboard` | `sern.clipboard.writeText(text)` | low |

   Prefer `repo` over `git` whenever you only need to read. For example, use `sern.repo.remoteUrl()`, not
   `git remote get-url`. Ask for `git` only when the plugin must change the repository or needs a git command
   that `repo` doesn't cover.

## 3. The manifest (`sern-plugin.json`)

```json
{
  "id": "yourname.plugin-name",
  "name": "Plugin name",
  "version": "1.0.0",
  "description": "One sentence on what it does.",
  "author": "Your name",
  "sernApi": 1,
  "main": "main.js",
  "permissions": ["repo"],
  "contributes": {
    "commands": [
      { "id": "do-thing", "title": "Do the thing", "scope": "commit" }
    ]
  }
}
```

Validation rules. A manifest that breaks any of these is refused at install:

| Field | Rule |
|---|---|
| `id` | Required. Matches `^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$`, at most 64 characters. Lowercase only: `acme.tag-helper` is fine; `Acme.Tag_Helper` is refused. It's also the install folder name. |
| `name` | Required. Non-empty, at most 60 characters. |
| `version` | Required. Non-empty, at most 32 characters (use semver). |
| `description` | Optional. At most 300 characters. |
| `author` | Optional. At most 100 characters. |
| `sernApi` | Required. Must be the number `1`. |
| `main` | Required. A path inside the folder, and the file must exist. |
| `permissions` | Optional. Each one of `repo`, `git`, `actions`, `scripts`, `network`, `open-url`, `clipboard`; an unknown name refuses the whole manifest. |
| `scripts` | Required with the `scripts` permission, and only allowed with it. An object of up to 20 names and paths: `{ "build": "scripts/build.ps1" }`. A script that runs as administrator is an object instead: `{ "setup": { "path": "scripts/setup.ps1", "admin": true } }`. Names match `^[A-Za-z0-9][\w.-]*$`. Paths are relative to the plugin's folder (`/` or `\`), with no `..`, no drive and no `:`, and end in `.ps1`, `.bat` or `.cmd`. The files must exist when the script runs. |
| `network` | Required with the `network` permission, and only allowed with it. A list of up to 20 lowercase hosts: either exact (`"api.github.com"`) or `"*.example.com"`, which matches every subdomain but not `example.com` itself. No scheme, port or path. `"*.com"` and `"localhost"` are refused. List the fewest hosts that work. |
| `contributes.commands` | Optional, at most 50. Each `id` matches `^[A-Za-z0-9][\w.-]*$` (at most 64 characters, no duplicates). Each `title` is non-empty, at most 80 characters, and written as an action ("Copy commit link"). `scope` is one of `app`, `new-tab`, `repo`, `commit`, `branch`, `file`. |

Package limits: at most 2000 files and 50 MB unpacked, and `main.js` at most 5 MB.

## 4. The script (`main.js`)

Rules:

1. **Register every command id listed in the manifest**, with the same id, at the top level of the script.
   A listed command you never register shows the user "The plugin didn't register the command …". A command
   you register but don't list never appears.
2. **The top level must finish within 5 seconds.** Otherwise the plugin is stopped and marked failed. Do only
   setup there; no long work and no loops waiting on anything.
3. **Classic script only.** If you need npm packages or TypeScript, bundle into one IIFE file:
   `esbuild src/main.ts --bundle --format=iife --platform=browser --outfile=main.js`
4. **No `eval`, no `new Function`, no `importScripts`.** All are blocked; some template or compiler libraries
   need them and will fail.
5. **No direct network.** `fetch`, `XMLHttpRequest` and `WebSocket` all fail. To call a web API, use
   `sern.http.fetch` with the `network` permission and the API's host in `network` (section 5).
6. **Throw an `Error` with a clear message to report failure.** SERN shows it as a toast titled with the command.
   What the handler returns is ignored.

Template:

```js
/// <reference path="sern.d.ts" />
// <Plugin name>: <one line on what it does>.

sern.commands.register("do-thing", async (ctx) => {
  // ctx: { scope, repo: { root, name }, branch, head, commit?, targetBranch?, files? }
  const answer = await sern.ui.prompt({ title: "Do the thing", label: "Value", placeholder: "…" });
  if (answer === null) return; // the user cancelled: do nothing, show nothing
  // … work …
  await sern.ui.toast("Done", "success");
});
```

## 5. API reference

Every call is async. A call that's refused (missing permission, bad parameter, guarded git command) **rejects**
with an `Error` whose message explains why.

### Commands, UI, storage and events (no permission needed)

- `sern.commands.register(id, handler)` is synchronous. `handler(ctx)` may be async.
- `sern.ui.toast(message, kind?)`:
  - `kind` is `"info"` (default), `"success"` or `"error"`.
  - The message is at most 2000 characters; SERN prefixes it with the plugin's name.
- `sern.ui.prompt({ title, label?, value?, placeholder?, okLabel?, multiline?, secret?, allowEmpty? })`:
  - Resolves to the **trimmed** text, or `null` if cancelled.
  - `secret: true` hides what's typed. Use it for tokens and passwords.
  - `title` is at most 100 characters, `okLabel` at most 40. `value` is the initial text.
- `sern.ui.choose({ title, message, choices })`:
  - Give 1–6 choices, each `{ label (≤40), value (≤200), tone?: "primary" | "danger" }`.
  - Resolves to the picked choice's `value`, or `null`.
- `sern.ui.confirm(message, { title?, okLabel?, danger? })` resolves to a boolean.
- `sern.ui.form({ title, message?, okLabel?, fields })`: one dialog with 1–20 fields. It resolves to
  `{ [fieldId]: value }`, or `null` if cancelled. Use it whenever you need more than one value, instead of
  chaining several prompts. The field types are:

  | `type` | Extra properties | Value returned |
  |---|---|---|
  | `"text"` (default) | `placeholder` | string, trimmed |
  | `"password"` | `placeholder` | string (pair with `sern.secrets` for tokens) |
  | `"textarea"` | `placeholder` | string, as typed |
  | `"number"` | `min`, `max`, `step`, `placeholder` | number, or `null` if left empty |
  | `"select"` | `options` (1–2000), `searchable?` | the chosen option's `value`; starts on the first option |
  | `"radio"` | `options` (1–20) | the chosen option's `value`, or `""` if none was picked |
  | `"checkbox"` | – | boolean |
  | `"info"` | `label` is the text (≤2000) | none (and it needs no `id`) |

  - Every field except `info` needs an `id` matching `^[A-Za-z_][\w-]*$`, unique within the form.
  - Every field may have a `label` (≤100 characters), a starting `value` of its kind, a `hint` (≤300), and
    `required: true`.
  - A `select` with more than 10 options gets a search box automatically. The user types to filter by label or
    value, words in any order. Force it with `searchable: true` or turn it off with `searchable: false`. Use a
    `select` for long lists such as users, projects or branches; there's no need to pre-filter. Keep `radio` for
    2–5 visible choices.
  - An option is a string, or `{ value, label? }`. A starting `value` for `select` or `radio` must be one of the
    options.
  - SERN won't close the form while a required field is empty or a number is outside `min` and `max`: it
    marks the field instead. So you don't need to re-check those. Still validate anything else, such as formats, and throw a clear `Error`.
  - A bad form description rejects with a message naming the field, e.g. `Field 2: "options" must list 1 to
    100 choices.`

  Example (the project list may be long; it becomes searchable on its own):

  ```js
  const v = await sern.ui.form({
    title: "Create issue",
    okLabel: "Create",
    fields: [
      { id: "project", type: "select", label: "Project", options: projects.map((p) => ({ value: p.key, label: p.name })) },
      { id: "summary", label: "Summary", required: true },
      { id: "type", type: "radio", label: "Type", options: ["Bug", "Task"], value: "Task" },
      { id: "notify", type: "checkbox", label: "Notify watchers", value: true },
    ],
  });
  if (!v) return;
  ```
- `sern.ui.showOutput(title, text)`:
  - Shows long text in a dialog, at most 1,000,000 characters.
  - Use it for reports and lists; use toasts for short status.
- `sern.storage.get(key)`, `.set(key, value)`, `.delete(key)`:
  - Stores JSON values, kept across restarts. `get` of a missing key resolves to `null`.
  - The total is at most 256 KB per plugin; keys are at most 200 characters.
- `sern.events.on("repoOpened" | "repoChanged", listener)` returns `{ dispose() }`:
  - `repoOpened` gets `{ root, name }`. It also fires when the user switches to another repository's tab.
  - `repoChanged` gets `{ worktree, refs }`. It also fires after your own git commands, so don't run git
    unconditionally inside it, or you'll loop.

Every dialog title shows `· <plugin name>` after your title. Dialogs from plugins are queued and open one at a
time.

### `repo` permission (read-only)

| Call | Resolves to |
|---|---|
| `sern.repo.status()` | `{ branch: { head, oid, upstream, ahead, behind }, files: [{ path, origPath, staged, unstaged }], operation }` |
| `sern.repo.refs()` | `{ branches: [{ name, remote, head, commit, time, upstream, ahead, behind, gone }], remotes: string[] }` |
| `sern.repo.log({ limit?, all?, path? })` | `Commit[]`, newest first. `limit` is an integer from 1 to 1000 (default 50). |
| `sern.repo.commit(id)` | `{ message, files: [{ path, origPath, kind }] }` |
| `sern.repo.remoteUrl(name = "origin")` | the URL as a string, or `null` if there's no such remote |

`Commit` is `{ id, parents, authorName, authorEmail, time /* unix seconds */, refs, summary }`.

### `git` permission

`sern.git.run(args: string[])` resolves to `{ code, stdout, stderr }`.

- Pass arguments as an **array of words**, without the leading `git`: `["log", "-n", "5", "--format=%H"]`.
  There is no shell, so quoting, pipes and `&&` don't apply.
- A non-zero exit code **does not reject**. Check `code` yourself.
- It always runs in the repository that's open in SERN. You can't choose another one.
- git never opens an editor: a `commit` without `-m` or `--message=…` fails. Output past 10 MB is cut.
- Commands that lose work (`reset --hard`, `clean -f`, `push --force`, `checkout -- .`, …) show the user a
  confirmation naming your plugin. If the user declines, the call rejects with "You chose not to run it."
  Handle that rejection quietly.
- Use machine-readable formats when you parse output: `--porcelain`, `--format=…`, `-z`.

**Refused.** These reject immediately; don't try to work around them:

- any option before the subcommand: `-c`, `-C`, `--git-dir`, `--work-tree`, `--no-pager`, …
- subcommands outside this list. Aliases are refused too. The allowed subcommands are:
  - `add`, `apply`, `blame`, `branch`, `cat-file`, `check-attr`, `check-ignore`, `checkout`, `cherry`, `cherry-pick`
  - `clean`, `commit`, `config`, `count-objects`, `describe`, `diff`, `diff-files`, `diff-index`, `diff-tree`, `fetch`
  - `for-each-ref`, `gc`, `grep`, `log`, `ls-files`, `ls-remote`, `ls-tree`, `merge`, `merge-base`, `mv`
  - `name-rev`, `notes`, `pull`, `push`, `range-diff`, `rebase`, `reflog`, `remote`, `reset`, `restore`
  - `rev-list`, `rev-parse`, `revert`, `rm`, `shortlog`, `show`, `show-ref`, `stash`, `status`, `switch`
  - `sparse-checkout`, `symbolic-ref`, `tag`, `update-ref`, `version`, `whatchanged`, `worktree list`
- `config`, except reads with `--get`, `--get-all`, `--get-regexp`, `--list`, or `config get` / `config list`.
  `--file`, `-f` and `--blob` are refused.
- These options on any command: `--upload-pack`, `--receive-pack`, `--exec-path`, `--output`, `--no-index`,
  `--unsafe-paths`, `--open-files-in-pager`
- `push --exec`, `rebase -x` / `--exec`, `rebase -i`, and `ls-remote -u`
- `grep -O`
- merge strategies other than `ort`, `recursive`, `resolve`, `octopus`, `ours`, `subtree`
- reading a message from a file: `commit -F` / `--file` / `-t` / `--template`, `tag -F`, `notes -F`, `merge -F`,
  and `blame --contents`
- any `worktree` command other than `worktree list`

Also, a value that starts with `-` and is passed as a separate word can be mistaken for an option:
`["commit", "-m", "-Fix"]` is refused as `-F`. Attach such values with `=`: `["commit", "--message=-Fix"]`.

### `actions` permission

To run a program the user already has set up, ask the user to add a **Repository custom action** for it, and run
that by name. To run a script that comes with the plugin, use the `scripts` permission instead (next section).

- `sern.actions.list()` resolves to `[{ name }]`: the user's Repository custom actions.
- `sern.actions.run(name)` runs the one with that name (ignoring case) in the open repository and resolves to what
  it printed. It runs as if the user ran it: `{input:…}` prompts, its confirmation if it has one, and its output
  dialog or toast.
- It rejects if there's no such action, if the user cancels (`"You chose not to run it."`), or if the program
  fails. Don't hard-code an action the user may not have: let them pick one from `list()` and remember it in
  `sern.storage`.

### `scripts` permission

`sern.scripts.run(name, { args?, timeout?, show?, title? })` runs the script listed as `name` in the manifest's
`scripts` and resolves to `{ code, stdout, stderr }`.

- The user is asked before each run, unless they chose **Always run its scripts** for the plugin. If they decline,
  the call rejects with "You chose not to run it." Handle that rejection quietly.
- It runs in the open repository, or in the plugin's folder when none is open. Find the plugin's own files from the
  script: `$PSScriptRoot` in PowerShell, `%~dp0` in batch.
- `.ps1` runs with Windows PowerShell (`-NoProfile -NonInteractive -ExecutionPolicy Bypass -File`); `.bat` and `.cmd`
  run with cmd. There's no window and no input: don't prompt from the script. Ask with `sern.ui.form` and pass the
  answers as `args`.
- `args` is up to 100 strings. Each reaches a batch file as one quoted word; one that can't be passed safely is
  refused.
- **Prefer `.ps1` for anything that takes arguments.** In a batch file, use `%1` or `"%~1"`, never a bare `%~1`:
  it drops the quotes, and cmd then runs whatever follows a `&` or `|` in the value.
- A non-zero exit code **does not reject**. Check `code` yourself. Each stream keeps its first 10 MB.
- `timeout` is in seconds, from 1 to 3600 (default 600). A script still running then is stopped and the call rejects.
- **For anything that takes more than a few seconds, pass `show`.** `show: "progress"` shows a panel with a progress
  bar that closes itself when the script succeeds; `show: "log"` also shows the output live and stays open until the
  user closes it. `title` names the panel (default: the script's name). The user can stop the script from the panel:
  the call then rejects with "The script was stopped." Handle that quietly too.
- To move the bar, the script prints `##sern[progress] <percent> <message>` lines to stdout, e.g.
  `Write-Output "##sern[progress] 40 Compiling"`. Without a number the bar just moves. These lines are left out of
  `stdout`. `Write-Progress` doesn't reach SERN.
- Prefer `repo`, `git` or `network` when they can do the job: scripts are the one thing that runs outside the
  sandbox.
- **Only if a script truly needs administrator rights**, list it as `{ "path": "scripts/setup.ps1", "admin": true }`.
  It then runs as administrator: SERN asks before every run (even with **Always run its scripts**), and Windows' UAC
  prompt follows. If the user declines that, the call rejects with "You didn't let the script run as
  administrator." `timeout` counts from the user's yes; everything else works as above. Mapped drive letters may be
  missing for it: use `\\server\share` paths.

### Commit message template (no permission needed)

`sern.commit.setTemplate({ summary, body? } | null)` pre-fills the commit box of the open repository.

- `summary` is one line, at most 200 characters; `body` at most 10,000. `null` (or an empty summary) clears it.
- SERN puts it in the box only while the summary is empty or still the previous template's, so it never replaces
  what the user typed. It fills the box again after each commit, so set it once per branch, not after every commit.
- While the summary is the template's, writing the message with AI keeps the summary and writes the AI's message
  into the description.
- Typical use: listen to `repoOpened` and `repoChanged` (with `refs: true`), and set it when the branch changes.

### Secrets (no permission needed)

`sern.secrets.get(key)`, `.set(key, value)` and `.delete(key)` keep text in the Windows Credential Manager. Each
plugin only sees its own secrets, and uninstalling deletes them.

- `get` resolves to `null` when there's no such secret.
- Keys use letters, digits, `.`, `_` and `-`, at most 100 characters. Values are at most 10,000 characters.
- **Always** store API tokens and passwords here, never in `sern.storage`. Non-secret settings, such as a site
  name or an email, go in `sern.storage`.

### `network` permission

`sern.http.fetch(url, { method?, headers?, body? })` resolves to
`{ status, ok, headers, body, text(), json() }`.

- `method` is one of `GET` (the default), `POST`, `PUT`, `PATCH`, `DELETE` and `HEAD`.
- `headers` is an object of text values, at most 50. `Host`, `Content-Length`, `Transfer-Encoding` and
  `Connection` are refused.
- `body` is text, at most 5 MB. For JSON, use `JSON.stringify(data)` and set
  `"Content-Type": "application/json"`.
- The response's header names are lowercase. `body` is text, at most 10 MB; binary data doesn't survive.
  `json()` throws if the body isn't JSON.
- A 4xx or 5xx status **does not reject**: check `ok` or `status`. Network failures and timeouts (30 s) do
  reject.

Refused, by rejecting immediately:

- a host that isn't matched by the manifest's `network` list, or that the user hasn't approved
- anything but `https://`
- a user name or password inside the URL (`https://user:pass@…`): send credentials in a header instead

**Redirects are not followed.** A `3xx` comes back as is. To follow it, read `headers.location` and call
`fetch` again; that only works if the new host is also allowed.

SERN sends the request itself, so CORS never applies. Any REST API works if its host is listed.

Typical API pattern, with sign-in on first use (see [jira-issues/main.js](jira-issues/main.js)):

```js
async function account() {
  const token = await sern.secrets.get("token");
  if (token) return token;
  const entered = await sern.ui.prompt({ title: "Sign in", label: "API token", secret: true });
  if (entered === null) return null;
  await sern.secrets.set("token", entered);
  return entered;
}

sern.commands.register("show", async (ctx) => {
  const token = await account();
  if (!token) return;
  const r = await sern.http.fetch(`https://api.example.com/items/${encodeURIComponent(ctx.commit.id)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (r.status === 401) throw new Error("The token was refused. Sign in again.");
  if (!r.ok) throw new Error(`The API answered ${r.status}.`);
  await sern.ui.showOutput("Result", JSON.stringify(r.json(), null, 2));
});
```

Common APIs and the hosts they need:

| API | `network` | Auth header |
|---|---|---|
| Jira / Confluence Cloud | `"*.atlassian.net"` | `Basic ${btoa(email + ":" + apiToken)}` |
| GitHub | `"api.github.com"` | `Bearer <token>` |
| GitLab.com | `"gitlab.com"` | `Bearer <token>` (or a `PRIVATE-TOKEN` header) |
| Azure DevOps | `"dev.azure.com"` | `Basic ${btoa(":" + pat)}` |
| Slack webhook | `"hooks.slack.com"` | none (the URL is the secret, so keep it in `sern.secrets`) |

Never send repository data to a host the user wouldn't expect from the plugin's description.

### `open-url` and `clipboard`

- `sern.env.openUrl(url)` takes `http:` and `https:` only.
- `sern.clipboard.writeText(text)` takes at most 1,000,000 characters. It only works while the SERN window is
  focused, which is normal when the user just picked your command.

## 6. Handling context safely

- `ctx.commit`, `ctx.targetBranch` and `ctx.files` exist **only** for their scope. Check them before use.
- `ctx.branch` is `null` when HEAD is detached; `ctx.head` is `null` in a repository with no commits yet.
- `ctx.targetBranch` can be a remote branch like `"origin/feature"`. Use `(await sern.repo.refs()).remotes` to
  tell which part is the remote.
- `ctx.repo.root` uses forward slashes.
- Never trust text you got from git or the user as an option: put user-supplied names after `--` where git
  accepts it, e.g. `["log", "--", path]`.

## 7. Example: tag a commit (uses `git`)

`sern-plugin.json`:

```json
{
  "id": "example.quick-tag",
  "name": "Quick tag",
  "version": "1.0.0",
  "description": "Tags a commit from its right-click menu.",
  "author": "Example",
  "sernApi": 1,
  "main": "main.js",
  "permissions": ["git"],
  "contributes": { "commands": [{ "id": "tag", "title": "Tag this commit…", "scope": "commit" }] }
}
```

`main.js`:

```js
sern.commands.register("tag", async (ctx) => {
  const name = await sern.ui.prompt({ title: "Tag this commit", label: `Tag for ${ctx.commit.id.slice(0, 7)}`, placeholder: "v1.0.0" });
  if (name === null) return;
  if (name.startsWith("-")) throw new Error(`"${name}" isn't a valid tag name.`);
  // git checks the rest of the name; its message explains what's wrong.
  const out = await sern.git.run(["tag", name, ctx.commit.id]);
  if (out.code !== 0) throw new Error(out.stderr.trim() || "git tag failed.");
  await sern.ui.toast(`Tagged ${name}`, "success");
});
```

## 8. Checklist before you hand the plugin over

- [ ] `sern-plugin.json` is valid JSON and meets every rule in section 3, including the lowercase `id` and
      `"sernApi": 1`.
- [ ] Every `contributes.commands[].id` is registered with `sern.commands.register`, and nothing else is.
- [ ] `main.js` is one classic script: no `import`, `export`, `require`, `eval`, `new Function`, `fetch` or DOM
      use. Web calls go through `sern.http.fetch`.
- [ ] Each API's host is in `network`, as narrow as possible, and the `network` permission is requested.
- [ ] Tokens and passwords are asked for with `secret: true` and kept in `sern.secrets`, never in `sern.storage`
      or the code.
- [ ] HTTP responses are checked with `ok` or `status`, and a 401 tells the user how to sign in again.
- [ ] Permissions are the minimum needed; `git` only if the plugin really changes the repo.
- [ ] Every `sern.*` call is awaited, and cancelled prompts and forms (`null`) are handled by returning quietly.
- [ ] Several values are asked for in one `sern.ui.form`, not a chain of prompts.
- [ ] Failures throw `Error`s with messages a user understands, and success is confirmed with a short toast or
      output.
- [ ] git output is parsed from stable formats, and `code` is checked.
- [ ] The top level only registers commands and listeners, so it finishes in well under 5 seconds.
- [ ] The folder holds only the plugin. For distribution, package it as `<id>-<version>.sernx` (section 9).

## 9. How the user installs and tests it

1. SERN → **Settings → Plugins → From folder…** and pick the plugin folder. SERN copies it, so after editing,
   install it again (same `id` = update).
2. To share it, make a `.sernx` file in one of two ways:
   - **Settings → Plugins → Package folder…**
   - Without SERN:

     ```powershell
     Compress-Archive -Path my-plugin\* -DestinationPath my-plugin.zip; Rename-Item my-plugin.zip my-plugin.sernx
     ```

     `Compress-Archive` only writes `.zip`, so rename afterwards.

   Users install it by double-clicking it, with **Install .sernx…**, or with **From link…** (an https URL).
3. Approve the permissions dialog. For `network`, it lists every host.
4. The plugin card shows **On**, **Failed** with the reason, or the last uncaught error. Use the restart button
   after reinstalling.
5. Try each command from where its scope puts it (see section 2).

You can unit-test plugin logic without SERN by defining a fake `sern` global in Node or Bun before loading
`main.js`, e.g. `globalThis.sern = { commands: { register: (id, fn) => handlers[id] = fn }, ui: { ... } }`.
