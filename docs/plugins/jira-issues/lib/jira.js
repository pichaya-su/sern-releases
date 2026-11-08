// Calls to Jira's REST API.
/// <reference path="../../sern.d.ts" />

/** Calls Jira's REST API and returns the JSON answer. */
exports.jira = async (path, { host, email, token }) => {
  const response = await sern.http.fetch(`https://${host}${path}`, {
    headers: { Authorization: `Basic ${btoa(`${email}:${token}`)}`, Accept: "application/json" },
  });
  if (response.status === 401 || response.status === 403) throw new Error("Jira didn't accept the sign-in. Run \"Jira: sign in…\" again.");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Jira answered ${response.status}.`);
  return response.json();
};
