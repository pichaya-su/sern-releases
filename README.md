# SERN releases

Downloads for SERN, a simple, fast Git GUI for Windows. Get the newest `SERN-Setup-<version>.exe` from
[Releases](https://github.com/pichaya-su/sern-releases/releases/latest). Once it's installed, SERN updates itself.

The website, [pichaya-su.github.io/sern-releases](https://pichaya-su.github.io/sern-releases/), shows what SERN
does and has all the docs below. It's served from this repository by GitHub Pages: `index.html` and `docs.html`
render the files in `docs/` as they are, and read the latest release from GitHub, so updating the docs or
publishing a release updates the site.

## Using SERN

- [docs/guide.md](docs/guide.md): installing, updating, and every part of the app, with the keyboard shortcuts.

## Plugins

- [docs/plugins.md](docs/plugins.md): installing, sharing and writing plugins.
- [docs/plugins/PLUGIN_AGENT_GUIDE.md](docs/plugins/PLUGIN_AGENT_GUIDE.md): the API reference. Give it to an AI agent
  to have it write a plugin.
- [docs/plugins/sern.d.ts](docs/plugins/sern.d.ts): TypeScript types for the API.
- Examples: [commit-link](docs/plugins/commit-link), [jira-issues](docs/plugins/jira-issues) and
  [run-script](docs/plugins/run-script).

## License

SERN is free to use, for personal or commercial work, under the [SERN License Agreement](LICENSE). It isn't open
source: don't redistribute, modify or resell it. Plugins you write are yours to share under any terms.
