/// <reference path="../sern.d.ts" />
// Run script: runs the PowerShell and batch scripts listed in its manifest's "scripts".

async function run(title, name, args) {
  let out;
  try {
    out = await sern.scripts.run(name, { args, timeout: 60 });
  } catch (e) {
    if (e.message === "You chose not to run it.") return;
    throw e;
  }
  if (out.code !== 0) throw new Error(out.stderr.trim() || `The script exited with code ${out.code}.`);
  await sern.ui.showOutput(title, [out.stdout, out.stderr].filter((s) => s.trim()).join("\n"));
}

sern.commands.register("info", (ctx) => run("Repository info", "info", [ctx.branch ?? "(detached)"]));

sern.commands.register("hello", async () => {
  const name = await sern.ui.prompt({ title: "Say hello", label: "Your name", okLabel: "Run" });
  if (name !== null) await run("Hello", "hello", [name]);
});
