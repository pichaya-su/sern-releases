// Jira issues: an example SERN plugin that calls a web API, split into modules (see docs/plugins.md).
// Sign in once with your Atlassian site, email and an API token
// (https://id.atlassian.com/manage-profile/security/api-tokens); the token is kept in the
// Windows Credential Manager.
/// <reference path="../sern.d.ts" />

const { signIn, signOut } = require("./lib/account.js");
const { showIssues } = require("./commands/show.js");

sern.commands.register("sign-in", signIn);
sern.commands.register("sign-out", signOut);
sern.commands.register("show", showIssues);
