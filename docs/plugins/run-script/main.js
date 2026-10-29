/// <reference path="../sern.d.ts" />
// Run script: runs the PowerShell and batch scripts listed in its manifest's "scripts".

async function run(title, name, args) {
  let out;
  try {
    out = await sern.scripts.run(name, { args, timeout: 60 });
  } catch (e) {
    if (e.message === "You chose not to run it." || e.message === "You didn't let the script run as administrator.") return;
    throw e;
  }
  if (out.code !== 0) throw new Error(out.stderr.trim() || `The script exited with code ${out.code}.`);
  await sern.ui.showOutput(title, [out.stdout, out.stderr].filter((s) => s.trim()).join("\n"));
}

sern.commands.register("info", (ctx) => run("Repository info", "info", [ctx.branch ?? "(detached)"]));

// show: "log" puts up a panel with a progress bar and the output while the script runs.
sern.commands.register("steps", async () => {
  try {
    const out = await sern.scripts.run("steps", { show: "log", title: "Slow task" });
    if (out.code !== 0) throw new Error(`The script exited with code ${out.code}.`);
  } catch (e) {
    if (e.message === "You chose not to run it." || e.message === "The script was stopped.") return;
    throw e;
  }
});

// Listed with "admin": true, so it runs as administrator after Windows asks.
sern.commands.register("admin", () => run("Administrator", "admin", []));

sern.commands.register("hello", async () => {
  const name = await sern.ui.prompt({ title: "Say hello", label: "Your name", okLabel: "Run" });
  if (name !== null) await run("Hello", "hello", [name]);
});
