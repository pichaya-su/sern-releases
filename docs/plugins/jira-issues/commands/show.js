// The "show" command: the Jira issues a commit mentions.
/// <reference path="../../sern.d.ts" />

const { account } = require("../lib/account.js");
const { jira } = require("../lib/jira.js");

const ISSUE_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;

exports.showIssues = async (ctx) => {
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
};
