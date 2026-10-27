// Jira issues: an example SERN plugin that calls a web API (see docs/plugins.md).
// Sign in once with your Atlassian site, email and an API token
// (https://id.atlassian.com/manage-profile/security/api-tokens); the token is kept in the
// Windows Credential Manager.
/// <reference path="../sern.d.ts" />

const ISSUE_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;

async function signIn() {
  const site = await sern.ui.prompt({ title: "Jira: sign in", label: "Your Atlassian site", placeholder: "acme.atlassian.net", value: (await sern.storage.get("site")) ?? "" });
  if (site === null) return false;
  const host = site.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  if (!host.endsWith(".atlassian.net")) throw new Error(`"${site}" isn't an Atlassian site (…atlassian.net).`);
  const email = await sern.ui.prompt({ title: "Jira: sign in", label: "Your Atlassian email", value: (await sern.storage.get("email")) ?? "" });
  if (email === null) return false;
  const token = await sern.ui.prompt({ title: "Jira: sign in", label: "API token", secret: true });
  if (token === null) return false;

  const me = await jira("/rest/api/3/myself", { host, email, token });
  await sern.storage.set("site", host);
  await sern.storage.set("email", email);
  await sern.secrets.set("token", token);
  await sern.ui.toast(`Signed in to ${host} as ${me.displayName}`, "success");
  return true;
}

/** The saved sign-in, asking for it if there's none. */
async function account() {
  const [host, email, token] = await Promise.all([sern.storage.get("site"), sern.storage.get("email"), sern.secrets.get("token")]);
  if (host && email && token) return { host, email, token };
  return (await signIn()) ? account() : null;
}

/** Calls Jira's REST API and returns the JSON answer. */
async function jira(path, { host, email, token }) {
  const response = await sern.http.fetch(`https://${host}${path}`, {
    headers: { Authorization: `Basic ${btoa(`${email}:${token}`)}`, Accept: "application/json" },
  });
  if (response.status === 401 || response.status === 403) throw new Error("Jira didn't accept the sign-in. Run \"Jira: sign in…\" again.");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Jira answered ${response.status}.`);
  return response.json();
}

sern.commands.register("sign-in", signIn);

sern.commands.register("sign-out", async () => {
  await sern.secrets.delete("token");
  await sern.ui.toast("Signed out of Jira");
});

sern.commands.register("show", async (ctx) => {
  const { message } = await sern.repo.commit(ctx.commit.id);
  const keys = [...new Set(message.match(ISSUE_KEY) ?? [])];
  if (!keys.length) {
    await sern.ui.toast("This commit doesn't mention a Jira issue.");
    return;
  }
  const acc = await account();
  if (!acc) return;
  const issues = await Promise.all(
    keys.map(async (key) => ({ key, issue: await jira(`/rest/api/3/issue/${key}?fields=summary,status,assignee`, acc) })),
  );
  const lines = issues.map(({ key, issue }) =>
    issue
      ? `${key}  [${issue.fields.status.name}]  ${issue.fields.summary}${issue.fields.assignee ? `  (${issue.fields.assignee.displayName})` : ""}`
      : `${key}  not found on ${acc.host}`,
  );
  const found = issues.filter((i) => i.issue);
  if (found.length === 1) {
    const open = await sern.ui.choose({
      title: found[0].key,
      message: lines.join("\n"),
      choices: [{ label: "Open in browser", value: "open", tone: "primary" }],
    });
    if (open) await sern.env.openUrl(`https://${acc.host}/browse/${found[0].key}`);
  } else {
    await sern.ui.showOutput(`Jira issues in ${ctx.commit.id.slice(0, 7)}`, lines.join("\n"));
  }
});
