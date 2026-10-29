# Plugins

A SERN plugin is a folder with a manifest (`sern-plugin.json`) and one JavaScript file. It's shared as a
**`.sernx` file**, which is a zip of that folder. A plugin adds commands to the command palette and to the
right-click menus of commits, branches and changed files. Each plugin runs in its own sandbox and can only do
what the user allowed when installing it.

There are two examples:

- [plugins/commit-link](plugins/commit-link) opens a commit or branch on GitHub, GitLab or Bitbucket.
- [plugins/jira-issues](plugins/jira-issues) calls Jira's API to show the issues a commit mentions.

Types for the API are in [plugins/sern.d.ts](plugins/sern.d.ts). To have an AI agent write a plugin, give it
[plugins/PLUGIN_AGENT_GUIDE.md](plugins/PLUGIN_AGENT_GUIDE.md).

## Install

Double-click a `.sernx` file, or use **Settings → Plugins** (or the palette: "Install plugin from file…"):

- **Install .sernx…**: a `.sernx` file. A plain `.zip` of the plugin folder works too.
- **From link…**: an `https://` link to a `.sernx` or `.zip`, up to 20 MB. A GitHub "Download ZIP" link works
  too: the zip's top folder is skipped.
- **From folder…**: copies a plugin folder, which is handy while writing one. Install it again after each change.
  The copy leaves out `.git` and `node_modules`.

Before installing, SERN shows the plugin's name, author, source and permissions. Installing a plugin with the
same id again updates it. If the new version asks for more permissions, it stays off until you review them.

Installed plugins live in `%APPDATA%\dev.sern.desktop\plugins\<id>`. The Plugins section can open that folder.
It also turns plugins on and off, restarts them, and uninstalls them. Uninstalling also removes anything the
plugin saved.

## Share a plugin

To make a `.sernx` file, use **Settings → Plugins → Package folder…**. It checks the folder the same way
installing does, and leaves out `.git` and `node_modules`.

Without SERN, zip the folder's contents and rename the zip. `sern-plugin.json` must be at the zip's root or in
one top folder:

```powershell
Compress-Archive -Path my-plugin\* -DestinationPath my-plugin.zip
Rename-Item my-plugin.zip my-plugin.sernx
```

Double-clicking `.sernx` files works once SERN is installed with its installer, which registers the file type.
If SERN is already open, the double-click opens a second SERN window to install the plugin. The first window
picks the plugin up the next time you switch to it.

## The manifest

```json
{
  "id": "acme.commit-link",
  "name": "Commit link",
  "version": "1.0.0",
  "description": "Opens commits on the web",
  "author": "Acme",
  "sernApi": 1,
  "main": "main.js",
  "permissions": ["repo", "open-url"],
  "network": [],
  "contributes": {
    "commands": [{ "id": "open", "title": "Open commit on the web", "scope": "commit" }]
  }
}
```

| Field | |
|---|---|
| `id` | Lowercase words, digits and `-`, separated by dots; at most 64 characters. Also the folder name. |
| `sernApi` | The plugin API version; this SERN runs `1`. |
| `main` | The script to run, relative to the folder. |
| `permissions` | Any of the permissions below; leave it out if you need none. |
| `network` | The hosts the `network` permission may reach: `"api.github.com"`, or `"*.atlassian.net"` for any subdomain. Required with that permission, at most 20. |
| `scripts` | The scripts the `scripts` permission may run, by name: `{ "build": "scripts/build.ps1" }`, or `{ "setup": { "path": "scripts/setup.ps1", "admin": true } }` for one that [runs as administrator](#running-a-script-as-administrator). `.ps1`, `.bat` or `.cmd` files in the plugin's folder. Required with that permission, at most 20. |
| `contributes.commands` | Up to 50 commands, each with an `id`, a `title` and a `scope`. |

A command's `scope` decides where it shows up, as for custom actions (`app` and `new-tab` are for plugins only):

| Scope | Shows up in |
|---|---|
| `app` | the command palette, even with no repository open: for commands like signing in to a service |
| `new-tab` | the new tab menu (**+**) and the welcome page, after Open and Clone, and the command palette, even with no repository open: for commands that open a repository with `sern.repo.open` |
| `repo` (default) | the repository menu and the command palette |
| `commit` | the commit's right-click menu in History, and the palette while a commit is open |
| `branch` | the branch's right-click menu in the sidebar |
| `file` | the right-click menu of changed files, and the palette while a file is selected |

## The script

The script runs once when SERN starts, or when the plugin is installed or turned on. It must register a
handler for each command in the manifest:

```js
sern.commands.register("open", async (ctx) => {
  const remote = await sern.repo.remoteUrl("origin");
  await sern.env.openUrl(`${remote.replace(/\.git$/, "")}/commit/${ctx.commit.id}`);
});
```

The handler gets what the command was run on:

| Field | Value |
|---|---|
| `repo` | `{ root, name }`; `null` for an `app` command run with no repository open |
| `branch` | the current branch |
| `head` | the current commit id |
| `commit` | the commit (scope `commit`) |
| `targetBranch` | the branch (scope `branch`) |
| `files` | the selected paths (scope `file`) |

If the handler throws, SERN shows the error.

The script is a classic script, not a module, so it can't `import`. If you use npm packages or TypeScript, bundle
them into one file first, for example:

```sh
esbuild src/main.ts --bundle --format=iife --outfile=main.js
```

## API

| Call | Permission |
|---|---|
| `sern.commands.register(id, handler)` | |
| `sern.ui.toast(message, kind?)` | |
| `sern.ui.prompt({ title, label?, value?, placeholder?, okLabel?, multiline?, secret? })`: the text, or null; `secret` hides what's typed | |
| `sern.ui.choose({ title, message, choices: [{ label, value }] })`: the value, or null | |
| `sern.ui.confirm(message, { title?, okLabel?, danger? })` | |
| `sern.ui.form({ title, message?, okLabel?, fields })`: the values by field id, or null | |
| `sern.ui.showOutput(title, text)` | |
| `sern.storage.get(key)`, `.set(key, value)`, `.delete(key)`: JSON values, up to 256 KB in all | |
| `sern.secrets.get(key)`, `.set(key, value)`, `.delete(key)`: text kept in the Windows Credential Manager, for tokens | |
| `sern.events.on("repoOpened" \| "repoChanged", listener)` | |
| `sern.repo.status()`, `.refs()`, `.log({ limit?, all?, path? })`, `.commit(id)`, `.remoteUrl(name?)` | `repo` |
| `sern.repo.open(path)`: opens that repository in SERN; `{ root, name }` | `repo` |
| `sern.git.run(["tag", "v1.0"])`: `{ code, stdout, stderr }` | `git` |
| `sern.actions.list()`: `[{ name }]`; `sern.actions.run(name)`: what the action printed (see below) | `actions` |
| `sern.scripts.run(name, { args?, timeout?, show?, title? })`: runs one of the plugin's own scripts; `{ code, stdout, stderr }` (see below) | `scripts` |
| `sern.commit.setTemplate({ summary, body? } \| null)`: pre-fills the commit message (see below) | |
| `sern.http.fetch(url, { method?, headers?, body? })`: `{ status, ok, headers, body, json(), text() }` | `network` |
| `sern.env.openUrl(url)`: http and https only | `open-url` |
| `sern.clipboard.writeText(text)` | `clipboard` |

Dialogs from plugins show the plugin's name, and they open one at a time.

### Form dialogs

`sern.ui.form` shows one dialog with several fields, drawn with SERN's own controls:

| Field type | Shows | Value |
|---|---|---|
| `text` (default), `password` | a one-line box (`password` hides what's typed) | text; `text` is trimmed |
| `textarea` | a multi-line box | text |
| `number` | a number box, with `min`, `max` and `step` | a number, or null |
| `select` | a dropdown of `options` (up to 2000); with more than 10 it gets a search box | the picked option's `value` |
| `radio` | a row of choices from `options` (up to 20) | the picked option's `value`, or "" |
| `checkbox` | a checkbox | true or false |
| `repo` | a list of the git repositories in `folder`, with a search box on top (see below) | the picked repository's full path, or "" |
| `info` | text between the fields | none |

Every field but `info` needs an `id`. Each can also have a `label`, a `value` to start with, a `hint` under it,
a `placeholder`, and `required: true`. If the user presses OK while a required field is empty or a number is out
of range, SERN marks the field and keeps the dialog open. A form has 1 to 20 fields.

A searchable dropdown opens when it's clicked, with an arrow key, or when you just start typing. The list keeps
the options whose label or value contains every word typed, in any order: "doe jane" finds "Jane Doe". ↑ ↓ and
Enter pick one, and Escape closes the list without closing the dialog. Set `searchable: true` or `false` on a
`select` to choose yourself.

```js
const values = await sern.ui.form({
  title: "Create Jira issue",
  okLabel: "Create",
  fields: [
    { id: "project", type: "select", label: "Project", options: [{ value: "ABC", label: "Alpha" }, "XYZ"] },
    { id: "summary", label: "Summary", required: true },
    { id: "details", type: "textarea", label: "Details" },
    { id: "points", type: "number", label: "Story points", min: 1, max: 13 },
    { id: "urgent", type: "checkbox", label: "Urgent" },
  ],
});
if (!values) return; // cancelled
// values: { project: "ABC", summary: "…", details: "…", points: 3, urgent: false }
```

A `repo` field lists the git repositories SERN finds in `folder` (a full path; `~` is the home folder), shown by
name relative to it (`api`, `acme/web`). `depth` says how many folders deep to look, from 1 to 4: 1 finds only
`folder/A`, the default 2 also finds `folder/A/dev`, and 3 finds `folder/A/dev/app`. SERN doesn't look inside a
repository, or in hidden folders, `node_modules`, `target`, `dist`, `build` and `vendor`. Folders at the end that
every repository shares are left out of the names: with `depth: 3`, `code/a/dev/dev`, `code/b/dev/dev` and
`code/c/dev/dev` show as `a`, `b` and `c`, each with its full path beside it.

The list is always open, with a search box on top that looks at the names only. Typing picks the first match,
↑ ↓ (and Page Up/Down) move the pick, and Enter or a double click sends the form. Escape clears the search, then
closes the dialog.

The form opens at once and the field says "Looking for repositories…" until the folder has been looked through;
OK waits for it. SERN stops after 10,000 folders, 2 seconds or 2000 repositories and says under the field that
some may be missing, so point `folder` at your projects, not a whole drive. If the folder doesn't exist, the field
says so (a required field then keeps the form open).

A plugin can't read the disk, so this is how it offers the user a repository to pick
without being able to see the folder itself: only the picked path comes back. `value` can be a path or a name to
start on. Paired with `sern.repo.open`, it makes an "Open project…" command:

```js
sern.commands.register("open-project", async () => {
  const folder = (await sern.storage.get("folder")) ?? "~/projects";
  const values = await sern.ui.form({
    title: "Open project",
    okLabel: "Open",
    fields: [{ id: "repo", type: "repo", label: "Repository", folder, value: await sern.storage.get("last"), required: true }],
  });
  if (!values) return;
  await sern.storage.set("last", values.repo);
  await sern.repo.open(values.repo);
});
```

A plugin can't draw any other UI of its own.

### Commit message templates

`sern.commit.setTemplate({ summary, body? })` pre-fills the commit box of the open repository, for example with
`ABC-123: Fix login` from the branch's Jira issue. SERN fills the box while the summary is empty or still holds the
previous template, so it never replaces what the user typed, and fills it again after each commit. While the
summary is the template's, ✨ (writing the message with AI) keeps it and writes the AI's message into the
description. `setTemplate(null)` clears it; it's also dropped when another repository opens.

### Running custom actions

A plugin with the `actions` permission can run the user's own Repository custom actions (Custom actions in the
repository menu) by name: `await sern.actions.run("Build & deploy")`. The user writes the command, so this is how a
plugin gets a build, a script or any other program run without being able to choose the program itself.

- The name is matched ignoring case. `sern.actions.list()` gives the names, e.g. to let the user pick one.
- Only Repository actions: Commit, Branch and Files actions need something the user picked.
- It runs as if the user ran it: it asks for `{input:…}` values, confirms first if the action is set to, and shows
  its output or a toast. It resolves to what the program printed.
- It rejects if there's no such action, if the user cancels (`"You chose not to run it."`), or if the program
  exits with an error.

### Running the plugin's own scripts

A plugin can ship PowerShell and batch scripts and run them, with the `scripts` permission and each script listed in
the manifest:

```json
{
  "permissions": ["scripts"],
  "scripts": { "build": "scripts/build.ps1", "clean": "scripts/clean.bat" }
}
```

```js
const out = await sern.scripts.run("build", { args: ["--release"], timeout: 300 });
if (out.code !== 0) throw new Error(out.stderr || `build failed (${out.code})`);
await sern.ui.showOutput("Build", out.stdout);
```

- Only the scripts listed in the manifest run, and only from the plugin's folder: the plugin passes a name, and SERN
  reads the path from the installed manifest itself.
- The install dialog lists every script. An update that adds a script or points one at another file asks again.
- Each run asks the user first, showing the script and its arguments. They can choose **Always run its scripts**;
  Settings → Plugins has **Ask before running a script** to turn that off, and an update turns it off too.
- It runs in the open repository, or in the plugin's folder with none open. Use `$PSScriptRoot` (PowerShell) or
  `%~dp0` (batch) to find the plugin's other files.
- `.ps1` files run with Windows PowerShell: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File`.
  `.bat` and `.cmd` files run with cmd. Each argument reaches a batch file as one quoted word (`"Mai Tester"`); one
  that can't be passed safely is refused.
- **In batch files, use `%1` or `"%~1"`, never a bare `%~1`.** `%~1` drops the quotes, and cmd then runs whatever
  follows a `&` or `|` in the value: `echo %~1` with `a"b & del x` runs `del x`. Arguments that come from users or
  web APIs are safest in a `.ps1`, where they're always plain text.
- No window opens and the script gets no input, so it can't prompt: a `Read-Host` or `pause` gets nothing.
- A failing exit code is part of the result, not an error. Output keeps the first 10 MB of each stream.
- `timeout` is in seconds, from 1 to 3600, 600 by default. A script still running then is stopped, along with the
  programs it's running, and the call rejects.
- The call rejects if the user says no (`"You chose not to run it."`).

Scripts aren't sandboxed: a script can do anything the user can. Prefer `git` or `network` when they're enough.

#### Running a script as administrator

A script that needs administrator rights, to install a service or change machine-wide settings, says so in the
manifest:

```json
"scripts": { "setup": { "path": "scripts/setup.ps1", "admin": true }, "build": "scripts/build.ps1" }
```

It's run with `sern.scripts.run("setup")` like any other, and the rules above still apply, with these differences:

- The install dialog marks it **as administrator**. An update that makes a script run as administrator asks again.
- SERN asks before every run, whatever the user chose for the plugin's other scripts. Then Windows asks too (the
  UAC prompt): it names SERN, because a copy of SERN runs the script and sends its output back. The call rejects
  if the user says no to either (`"You didn't let the script run as administrator."` for Windows' prompt).
- `timeout` counts from the user's yes. Output, `show` panels, progress lines and **Stop** work as usual.
- As administrator the script gets the user's environment afresh rather than SERN's, and drives mapped to a
  letter by the user (`Z:`) may be missing: use the full `\\server\share` path.

Ask for it only for the scripts that need it, and keep them short.

#### Showing progress and output

By default a script runs out of sight and the call resolves when it ends. For a longer one, pass `show` and SERN
shows a panel in the bottom-left corner while it runs, titled `title` (the script's name by default):

| `show` | The panel |
|---|---|
| `"progress"` | a progress bar and the script's latest line; closes itself when the script succeeds, and stays to show a failure |
| `"log"` | the bar, and the script's output as it prints it; stays open after the script ends until the user closes it |

Either way the user can open or hide the output, expand the panel into a dialog over the whole window (a panel
expanded that way stays open after the script ends), and stop the script with **Stop**: it's stopped along with the
programs it's running, and the call rejects with `"The script was stopped."`. The panel keeps the last 2000 lines;
the result still has all of the output (up to 10 MB). stderr shows in red.

To move the bar, print a line starting with `##sern[progress]` to stdout. A number after it is the percentage
(0 to 100), and the rest is the message shown under the bar. Without a number, the bar sweeps back and forth
until the next one. These lines are left out of the output and of `stdout`.

```powershell
Write-Output "##sern[progress] 0 Restoring packages"
dotnet restore
Write-Output "##sern[progress] 40 Compiling"
dotnet build --no-restore
Write-Output "##sern[progress] Waiting for the server"   # no number: the bar just moves
```

```bat
echo ##sern[progress] 50 Copying files
```

```js
const out = await sern.scripts.run("build", { show: "log", title: "Building", timeout: 900 });
```

PowerShell's `Write-Progress` doesn't reach SERN; use `Write-Output` or `Write-Host` with the line above. A line
updated in place with `\r` shows as its last version.

### Calling web APIs

A plugin with the `network` permission can call the hosts its manifest lists in `network`, and nothing else.
The user sees those hosts before installing. An update that adds a host stays off until the user allows it.

```js
const token = await sern.secrets.get("token");
const r = await sern.http.fetch("https://acme.atlassian.net/rest/api/3/issue/ABC-1", {
  headers: { Authorization: `Basic ${btoa(`${email}:${token}`)}`, Accept: "application/json" },
});
if (!r.ok) throw new Error(`Jira answered ${r.status}`);
const issue = r.json();
```

The request is sent by SERN rather than the sandbox, so CORS doesn't apply. The rules:

- **https only**, and no user name or password in the address: put credentials in a header.
- **No redirects are followed.** You get the `3xx` response; follow its `location` yourself if it's an allowed
  host.
- **Text bodies only**, in both directions: at most 5 MB sent and 10 MB received. Each request has 30 seconds.
- **Some headers are SERN's**: `Host`, `Content-Length`, `Transfer-Encoding` and `Connection` can't be set.
- **Keep tokens in `sern.secrets`**, not `sern.storage`. Ask for them with `sern.ui.prompt({ secret: true })`.
  Uninstalling the plugin deletes its secrets.

### What `git.run` refuses

The `git` permission lets a plugin change the repository and talk to remotes. Commands that lose work, such as
`reset --hard`, `clean -f` or `push --force`, ask the user first, exactly like the git console.

A plugin can't get git to start another program, change git's configuration, or reach files outside the
repository. So SERN refuses:

- options before the command, such as `-c` and `-C`
- aliases, and git commands outside a fixed list
- `config`, except reading it with `--get` or `--list`
- `--upload-pack`, `--receive-pack`, `push --exec`, `rebase --exec` and `rebase -i`
- other merge strategies than git's own
- `--output`, `--no-index` and `--unsafe-paths`
- `commit -F` and `commit -t`, `tag -F`, `notes -F` and `merge -F`, and `blame --contents`
- `worktree`, except `worktree list`

git never opens an editor for a plugin: a command that needs one fails. Output past 10 MB is cut.

## The sandbox

Each plugin runs in its own Web Worker. It gets no page and no access to SERN's own functions; it only gets the
`sern` object, and SERN checks every call it makes against the plugin's permissions. Scripts run with the `scripts`
permission are the exception: they run outside the sandbox, which is why each run asks first.

- **No direct network.** `fetch`, `XMLHttpRequest` and `WebSocket` are blocked. Use `sern.http.fetch` with the
  `network` permission. A plugin with the `git` permission can still fetch and push.
- **No `eval`.** `eval` and `new Function` are blocked too.
- **A slow start counts as a failure.** If the script doesn't finish running within 5 seconds, it's stopped and
  marked as failed. A plugin stuck in a loop can't freeze the window.
- **Errors are kept.** Errors the plugin doesn't catch are shown in Settings → Plugins, and the plugin keeps
  running.
- **Use `sern.storage` for your data.** `indexedDB` is shared by all plugins.

### Why a Worker

Code in SERN's page can call every backend command, including the one custom actions use to run any program.
iframes are no sandbox either: on Windows, Tauri adds its IPC bridge to every frame
([wry](https://docs.rs/wry/latest/wry/struct.WebViewBuilder.html#method.with_initialization_script_for_main_only)).
Workers get none of Tauri's scripts. Tauri's IPC also rejects requests without the per-launch key, which only
the page has.

## Not built yet

- views, panels and other UI of a plugin's own
- keyboard shortcuts and settings for plugins
- diff renderers and AI providers
- update checks, a plugin list to browse, and signing
