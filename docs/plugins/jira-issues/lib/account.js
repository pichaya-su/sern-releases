// The saved sign-in: the site and email in sern.storage, the token in sern.secrets.
/// <reference path="../../sern.d.ts" />

const { jira } = require("./jira.js");

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

async function signOut() {
  await sern.secrets.delete("token");
  await sern.ui.toast("Signed out of Jira");
}

/** The saved sign-in, asking for it if there's none. */
async function account() {
  const [host, email, token] = await Promise.all([sern.storage.get("site"), sern.storage.get("email"), sern.secrets.get("token")]);
  if (host && email && token) return { host, email, token };
  return (await signIn()) ? account() : null;
}

module.exports = { signIn, signOut, account };
