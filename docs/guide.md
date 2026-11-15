# Using SERN

SERN is a simple, fast Git GUI for Windows. It runs the `git` you already have, so the repositories, branches and
remotes it shows are exactly the ones Git sees, and anything it does you could also do on the command line. This
guide goes through each part of the app; the [keyboard shortcuts](#keyboard-shortcuts) are at the end.

## Install and update

1. Install [Git for Windows](https://git-scm.com/download/win) if you don't have it. SERN uses its `git` and its
   Git Credential Manager.
2. Download `SERN-Setup-<version>.exe` from the
   [latest release](https://github.com/pichaya-su/sern-releases/releases/latest) and run it. It installs SERN for
   your Windows user, with no admin prompt, and can add a desktop shortcut.

SERN and its setup aren't code-signed yet, so Windows SmartScreen warns the first time you run them: choose
**More info**, then **Run anyway**. Both need WebView2, which Windows 11 and up-to-date Windows 10 already have.

SERN looks for a new version when it starts and offers **Update and restart**, which installs the update without a
window of its own and opens SERN again. After an update, SERN shows what's new once. While an update waits, a dot
marks the settings button. **Settings → Updates** lists the patch notes of every release, newest first, and turns
the check off; check by hand with "Check for updates" in the command palette, or open the notes with "Patch notes". Versions 0.2.0
and older can't update themselves: install a newer one once by hand.

Running the setup with SERN already installed offers to update, reinstall or downgrade it in place. To uninstall
SERN, use Windows' **Settings → Apps**.

## Repositories and tabs

Open a repository with **Ctrl+O**, or press **+** in the title bar (**Ctrl+T**) to pick a recent one or clone one
from a link. Each repository opens in its own tab, which keeps its own view, selection, history search and scroll,
the commit message you're writing, the console, the AI chat and Undo. A fetch, pull or push keeps going when you
switch away, with a spinner on its tab.

Drag tabs to reorder them. Middle-click a tab, click its **×** or press **Ctrl+W** to close it. The tabs have the
top row to themselves; when they don't fit, the strip scrolls with the mouse wheel and a menu lists every open tab.
The row below acts on the active tab: the branch (a button listing branches to switch to, like **Ctrl+B**), Fetch,
Pull and Push on the left, and the palette, console and settings on the right. The tabs come back
when SERN starts again, and **Open in SERN** in Explorer adds a tab to the window that's already open.

Right-click a changed file → **Open in VS Code**, or run **Open repository in VS Code** from the palette. The
other way, start `sern.exe` with a file's path and its repository opens on that file's changes, or its history if
it has none; for example a VS Code task with `"command": "sern.exe"` and `"args": ["${file}"]`. A setting starts
SERN when you sign in to Windows.

Changes and commits you make in your editor or terminal show up right away; in a background tab, as soon as you
switch to it.

## Changes and commits

The Changes view (**Ctrl+1**) lists your changed files. Stage whole files, hunks or single lines: click line numbers
to pick lines, and Shift+click for a range. Discarding works the same way, on files, hunks or lines. From the
keyboard, move through files with ↑ and ↓, stage or unstage with Space, and discard with Delete.

Write a summary (**Ctrl+Shift+M** jumps to it) and commit with **Ctrl+Enter**, or turn on amend to change the last
commit instead. The commit button's menu also has **Commit & Push** and **Commit & Sync** (pull, then push), and
**Ctrl+Shift+Enter** commits and pushes.

### Undo

Discarding changes, deleting a merged branch, a stash or a tag, and a hard reset happen without a question and offer
**Undo** instead, on their notification and in the command palette ("Undo …"), until the next one. Undo leaves a
file alone if it was changed again since.

### Diffs

Diffs have syntax highlighting and show unified or side by side (**Ctrl+Shift+D**). Images show a before and after
preview. In the side-by-side view, selecting text stays in the column you start in, so a copy gets only the old or
only the new lines. Press **Ctrl+F** in a diff, or click the search button in its toolbar, to search it: matches are
highlighted and marked on the minimap, and Enter and Shift+Enter step through them.

## History

The History view (**Ctrl+2**) draws the commit graph across all branches. Open a commit to see its message, files
and diffs, and search commits with **Ctrl+F**. Right-click a commit to copy its hash, cherry-pick, revert, reword
or reset to it. A commit's files can show as a folder tree instead of a list, with the lines added and removed.

To work on several commits at once, Ctrl-click to add or remove one, or Shift-click (or **Shift+↑/↓**) to select a
range. Right-click the selection to copy their hashes, cherry-pick or revert them all, squash them into one commit,
or drop them. Squash and drop open the rebase plan first, so you can check it before anything changes.

### Drag branches

Drag a branch label in History, or a branch in the sidebar, onto another branch to fast-forward, merge or rebase
either one onto the other (also interactively), or onto a remote branch to push it there. Drop it on a commit to
reset the branch to it or start a new branch there. The menu lists only what makes sense for the two. An action
that works on the checked-out branch switches to it first, and moving a branch offers Undo. Esc cancels the drag.

### Interactive rebase

Right-click a commit → **Interactive rebase from here…** to reorder (drag, or Alt+↑/↓), reword, edit, squash, fixup
or drop the commits up to HEAD, with the keys P, R, E, S, F and D. The combined message of a squash can be edited
before it starts. **Squash / Fixup into parent**, **Edit commit** and **Drop commit** do one commit in a click.

A rebase stopped to edit or on conflicts continues or aborts from the banner, and a finished one offers Undo.

### File history and blame

Type a file's name in the toolbar search (**Ctrl+K**) to list the commits that changed it, following renames.
**Full history** in its header also lists commits from merged branches whose changes to the file weren't kept; it
is slower, so it's off until you turn it on.

To see who last changed each line, right-click a file in Changes → **Blame**, a file of a commit → **Blame this
version**, or type `blame <file>` in the palette. Each line shows its commit, author and age, with uncommitted lines
marked. Click a line's commit to open it in History.

## Branches and tags

Switch branches by double-clicking one in the sidebar, or selecting it and pressing Enter (**Ctrl+B** picks one by
name). Create (**Ctrl+Shift+N**), rename and delete branches, and check out remote branches. If a switch would
conflict with your changes, SERN offers to stash them first.

Once branches are merged and deleted on the remote, the button in the **Branches** heading deletes every local
branch whose remote branch is gone. Merged ones go at once, unmerged ones ask once for all of them, and one Undo
brings them all back.

The **Tags** section in the sidebar lists tags; click one to show its commit in History. Right-click a commit →
**Create tag here…** (or **+** in Tags for the current commit), with an optional message for an annotated tag and a
box to push it right away. Push one tag or all of them. Deleting a tag offers Undo.

## Merging and conflicts

Right-click a branch to merge it into the current one, or drag it onto any local branch. Fast-forward when
possible, always create a merge commit, or squash, which stages its changes for you to commit as one.

A merge that conflicts stays in progress: resolve the files in Changes, then continue or abort from the banner. A
rebase or a pull that conflicts works the same way. With [AI](#ai) set up, it can propose a merged file in the
conflict resolver.

## Stashes

Stash all changes, or only the files you pick (right-click them in Changes → **Stash**), untracked ones included,
with an optional message. **Keep staged changes** stashes them too but leaves them staged, to test or commit them
alone. Click a stash in the sidebar to browse its files (untracked ones too) and diffs before restoring it.

## Fetch, pull and push

Fetch (**Ctrl+Shift+F**), pull (**Ctrl+Shift+P**) and push (**Ctrl+P**) show live progress, and push publishes a
branch that isn't on the remote yet. Sign-in goes through Git Credential Manager.

- The arrow next to **Pull** picks, per repository, whether it merges or rebases your commits on top. Uncommitted
  changes are stashed and put back. A pull that conflicts stays in progress to resolve like a merge.
- The arrow next to **Push** (or **Push to…** in the palette) pushes to any remote and branch name, can make that
  the upstream, sends tags along (annotated ones on the pushed commits, or all) and can force push with lease,
  after showing which commits on the remote it would replace.

### Remotes

The **Remotes** section in the sidebar (or the palette) adds, renames and removes remotes and edits their URLs, with
an optional separate push URL. Removing one offers Undo, which brings back its settings, remote branches and the
upstreams that used it.

## Pull requests

For repositories on GitHub and Bitbucket Cloud, the **Pull requests** section in the sidebar lists the open pull
requests (the `upstream` repository's, in a fork) with their author, draft state, checks and review state.
Branches and History refs that have one get a #number badge.

Click a pull request to read its description, checks and reviewers, browse its commits and changed files, check it
out as a local branch (from a fork too, as `pr/<number>-<branch>`), merge it or open it in the browser.

Right-click a branch → **Create pull request…** (or the palette) fills in the title and description from its
commits, publishes the branch first if it isn't on the remote, and can open a draft on GitHub. With [AI](#ai) set
up, ✨ writes the description.

Sign-in uses what Git Credential Manager keeps for the host, so if you push over https there's nothing to set up.
Otherwise add a token in **Settings → Integrations**; it's kept in Windows Credential Manager.

## Command palette and git console

**Ctrl+K** opens the command palette, which runs every action by name.

The git console (toolbar → **Console**, or **Ctrl+`**) runs any git command in a drawer under the main view, with
live output and a **Stop** button. As you type, it completes commands, options (with git's own descriptions),
branches, remotes, changed files, stashes and recent commits, and explains what the command will do.

- Commands that lose work (`reset --hard`, `push --force`, `clean -f`, …) ask first.
- Commands that need a terminal (`add -p`, `mergetool`) are refused, with the way to do it in SERN instead.
- ↑ and ↓ recall earlier commands, per repository.
- Typing `git …` in the palette opens it in the console.

## Custom actions

Add your own commands from the repository menu or the palette → **Custom actions…**, for example
`git tag {input:Tag name} {commit}` or `code {repo}`. An action runs on the repository (from the repository menu and
the palette), a commit, a branch or files (from their right-click menus), and can use these variables:

| Variable | Value |
|---|---|
| `{repo}`, `{repoName}` | The repository's folder and name |
| `{branch}`, `{head}` | The current branch and commit id |
| `{commit}`, `{shortCommit}`, `{subject}` | The commit's id, short id and summary (commit actions) |
| `{targetBranch}` | The branch you right-clicked (branch actions) |
| `{file}`, `{files}` | The first selected file, or all of them as one argument each (file actions) |
| `{input:Question}` | Asks you for a value when the action runs |

Commands run in the repository folder without a shell, so values with spaces stay one argument.

## Git config

**Settings → Git config** shows your global git config file as text to view and edit. Saving is refused if git
can't parse it, or if the file changed in the meantime.

## Plugins

Plugins add commands to the palette and right-click menus, and can call web APIs such as Jira or GitHub.
Double-click a `.sernx` plugin, or install one in **Settings → Plugins** from a file, a link or a folder. Plugins
run sandboxed and only get the permissions and web hosts you allow when installing them.

To write one, see [Writing plugins](plugins.md).

## AI

AI is optional, and off until you set it up in **Settings → AI**. Connect Anthropic (Claude) or any
OpenAI-compatible server (OpenAI, Ollama, LM Studio, OpenRouter, …). The API key is kept in Windows Credential
Manager.

- **Commit messages**: the ✨ button in the summary box (or **Ctrl+Shift+G**) writes one from your staged changes,
  in the style of the repository's recent commits, Conventional Commits, or plain. Undo brings back what you had.
- **Ask AI** (console drawer → **Ask AI**, or **Ctrl+Shift+A**): a chat that knows your branch, changes, recent
  commits and console commands. Suggested git commands get **Run** and **Edit** buttons. They run in the git
  console, so commands that lose work still ask first.
- **Explain**: right-click a commit in History → **Explain with AI**. A failed console command or an error
  notification offers **Ask AI** to explain what went wrong and how to fix it.
- **Conflicts**: **Ask AI** in the conflict resolver proposes a merged file to review before it replaces the
  result.

## Appearance

**Settings → Appearance** picks the theme: System (follows Windows), Light, Dark, Glass Light, Glass Dark,
Telemetry Dark, Telemetry Light, Orbit Dark, Orbit Light, EDGERUNNERS or ENDFIELD. It also sets the interface size, the interface and
code fonts, and the code font size.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl+K | Command palette |
| Ctrl+\` | Open, focus or hide the git console |
| Ctrl+B | Switch branch |
| Ctrl+Shift+N | New branch |
| Ctrl+P / Ctrl+Shift+P | Push / Pull (not from inside a text box) |
| Ctrl+F | Search commits (in History), or search the diff |
| Ctrl+Shift+F | Fetch |
| Ctrl+Shift+M | Jump to the commit message |
| Ctrl+Shift+G | Write the commit message with AI |
| Ctrl+Shift+A | Open, focus or hide the AI chat |
| Ctrl+Enter | Commit (in the message box) |
| Ctrl+Shift+Enter | Commit and push (in the message box) |
| Ctrl+Shift+D | Unified or side-by-side diff |
| Ctrl+1 / Ctrl+2 | Changes / History |
| Ctrl+O | Open a repository (in a new tab) |
| Ctrl+T | New tab: a recent repository, open or clone |
| Ctrl+W | Close the tab |
| Ctrl+Tab / Ctrl+Shift+Tab | Next / previous tab |
| Ctrl+Alt+1 … Ctrl+Alt+8, Ctrl+Alt+9 | Tab by position, last tab |
| F5 | Refresh |
| ↑ ↓, Space, Delete | Move through files, stage or unstage, discard |
