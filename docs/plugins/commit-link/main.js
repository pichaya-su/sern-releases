// Commit link: an example SERN plugin (see docs/plugins.md). It turns the remote's URL into
// web links for commits and branches.
/// <reference path="../sern.d.ts" />

/** The web address of a remote: "git@github.com:me/app.git" → "https://github.com/me/app". */
function webUrl(remote) {
  let url = remote.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const scp = /^[\w.-]+@([^:/]+):(?!\/)(.+)$/.exec(url); // user@host:path
  if (scp) return `https://${scp[1]}/${scp[2]}`;
  return url
    .replace(/^ssh:\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\//, "https://$1/")
    .replace(/^(?:git|http):\/\//, "https://")
    .replace(/^https:\/\/[^@/]+@/, "https://"); // drop a user name or token
}

/** Where a host shows commits and branches. */
function linksFor(base) {
  const host = new URL(base).hostname;
  if (host.includes("gitlab")) return { commit: (id) => `${base}/-/commit/${id}`, branch: (b) => `${base}/-/tree/${encodeURI(b)}` };
  if (host.includes("bitbucket")) return { commit: (id) => `${base}/commits/${id}`, branch: (b) => `${base}/branch/${encodeURI(b)}` };
  return { commit: (id) => `${base}/commit/${id}`, branch: (b) => `${base}/tree/${encodeURI(b)}` };
}

async function repoLinks(remote = "origin") {
  const url = await sern.repo.remoteUrl(remote);
  if (!url) throw new Error(`This repository has no "${remote}" remote.`);
  if (/^[a-z]:|^\/|^\.|^file:/i.test(url)) throw new Error(`"${remote}" is a folder on this computer, not a website.`);
  const base = webUrl(url);
  return { base, ...linksFor(base) };
}

sern.commands.register("open-commit", async (ctx) => {
  await sern.env.openUrl((await repoLinks()).commit(ctx.commit.id));
});

sern.commands.register("copy-commit", async (ctx) => {
  await sern.clipboard.writeText((await repoLinks()).commit(ctx.commit.id));
  await sern.ui.toast("Link copied", "success");
});

sern.commands.register("open-branch", async (ctx) => {
  // "origin/feature" lives on that remote; a local branch is shown on origin.
  const { remotes } = await sern.repo.refs();
  const remote = remotes.find((r) => ctx.targetBranch.startsWith(`${r}/`));
  const links = await repoLinks(remote);
  await sern.env.openUrl(links.branch(remote ? ctx.targetBranch.slice(remote.length + 1) : ctx.targetBranch));
});

sern.commands.register("open-repo", async () => {
  await sern.env.openUrl((await repoLinks()).base);
});
