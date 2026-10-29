// Types for SERN plugins (plugin API 1): the global `sern` object a plugin's script gets.
// Copy this file into your plugin project, or point to it with
// /// <reference path="sern.d.ts" />
// Every call returns a promise; a refused or failed call rejects with an Error whose
// message says why.

declare namespace Sern {
  type Scope = "app" | "new-tab" | "repo" | "commit" | "branch" | "file";
  type ChangeKind = "added" | "modified" | "deleted" | "renamed" | "copied" | "typechange" | "untracked" | "conflicted";

  interface Commit {
    id: string;
    parents: string[];
    authorName: string;
    authorEmail: string;
    /** Unix seconds. */
    time: number;
    /** Branches and tags pointing at it, e.g. "HEAD -> main", "tag: v1.0". */
    refs: string[];
    summary: string;
  }

  /** What a command was run on. */
  interface CommandContext {
    scope: Scope;
    /** null for an "app" or "new-tab" command run with no repository open. */
    repo: { root: string; name: string } | null;
    /** Current branch; null when HEAD is detached. */
    branch: string | null;
    /** HEAD commit id; null before the first commit. */
    head: string | null;
    /** scope "commit": the commit. */
    commit?: Commit;
    /** scope "branch": the branch, e.g. "main" or "origin/main". */
    targetBranch?: string;
    /** scope "file": repository-relative paths. */
    files?: string[];
  }

  interface Status {
    branch: { head: string | null; oid: string | null; upstream: string | null; ahead: number; behind: number };
    files: { path: string; origPath: string | null; staged: ChangeKind | null; unstaged: ChangeKind | null }[];
    operation: "merge" | "rebase" | "cherry-pick" | "revert" | null;
  }

  interface Refs {
    /** Local branches first, then remote-tracking ones; each most recent first. */
    branches: {
      name: string;
      remote: string | null;
      head: boolean;
      /** Short id of the tip commit. */
      commit: string;
      time: number;
      upstream: string | null;
      ahead: number;
      behind: number;
      gone: boolean;
    }[];
    remotes: string[];
  }

  interface CommitDetails {
    message: string;
    files: { path: string; origPath: string | null; kind: ChangeKind }[];
  }

  interface GitOutput {
    /** git's exit code; a failing command doesn't reject. */
    code: number;
    stdout: string;
    stderr: string;
  }

  interface Choice {
    label: string;
    value: string;
    tone?: "primary" | "danger";
  }

  type Event = "repoOpened" | "repoChanged";
  interface EventPayloads {
    /** A repository is shown: opened, or its tab switched to. */
    repoOpened: { root: string; name: string };
    /** worktree: files or the index changed; refs: branches, tags or HEAD changed. */
    repoChanged: { worktree: boolean; refs: boolean };
  }

  /** One field of a form dialog. Its value comes back under `id`. */
  type FormField =
    | { type?: "text" | "textarea" | "password"; id: string; label?: string; value?: string; placeholder?: string; hint?: string; required?: boolean }
    | { type: "number"; id: string; label?: string; value?: number; min?: number; max?: number; step?: number; placeholder?: string; hint?: string; required?: boolean }
    | {
        type: "select" | "radio";
        id: string;
        label?: string;
        /** Strings, or { value, label }: up to 2000 for select, 20 for radio. */
        options: (string | { value: string; label?: string })[];
        /** select only: a search box that filters the options. Default: on when there are more than 10. */
        searchable?: boolean;
        /** Starts on the first option for select, on none for radio. */
        value?: string;
        hint?: string;
        required?: boolean;
      }
    | { type: "checkbox"; id: string; label?: string; value?: boolean; hint?: string }
    /**
     * A list, with a search box on top, of the git repositories in `folder` (a full path; "~" is
     * the home folder) and the folders below it. Its value is the picked repository's full path, or "".
     */
    | {
        type: "repo";
        id: string;
        folder: string;
        /** How many folders deep to look, 1 to 4: 1 lists `folder/A`, 3 also finds `folder/A/dev/app`. Default 2. */
        depth?: number;
        label?: string;
        /** A repository's path or name to start on. */
        value?: string;
        placeholder?: string;
        hint?: string;
        required?: boolean;
      }
    /** Text between the fields; no value. */
    | { type: "info"; label: string };

  interface HttpResponse {
    status: number;
    /** true for 2xx. */
    ok: boolean;
    /** Header names in lowercase; repeated headers joined with ", ". */
    headers: Record<string, string>;
    /** The body as text (binary bodies don't survive). */
    body: string;
    text(): string;
    /** JSON.parse of the body; throws if it isn't JSON. */
    json(): any;
  }

  type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
}

declare const sern: {
  commands: {
    /** Handles a command listed in sern-plugin.json; what it returns is ignored. */
    register(id: string, handler: (ctx: Sern.CommandContext) => unknown): void;
  };
  ui: {
    toast(message: string, kind?: "info" | "success" | "error"): Promise<void>;
    /** Resolves to the trimmed text, or null if cancelled. */
    prompt(options: {
      title: string;
      label?: string;
      value?: string;
      placeholder?: string;
      okLabel?: string;
      multiline?: boolean;
      /** Hides what's typed: for passwords and tokens. */
      secret?: boolean;
      allowEmpty?: boolean;
    }): Promise<string | null>;
    /** Resolves to the picked choice's value, or null if cancelled. 1 to 6 choices. */
    choose(options: { title: string; message: string; choices: Sern.Choice[] }): Promise<string | null>;
    confirm(message: string, options?: { title?: string; okLabel?: string; danger?: boolean }): Promise<boolean>;
    /**
     * A dialog with several fields (1 to 20). Resolves to the values by field id: text for
     * text/textarea/password/select/radio/repo (text trimmed), a number or null for number, a boolean
     * for checkbox. Null if cancelled. SERN keeps the form open while a required field is empty
     * or a number is out of range.
     */
    form(options: { title: string; message?: string; okLabel?: string; fields: Sern.FormField[] }): Promise<Record<string, string | number | boolean | null> | null>;
    /** Shows text in a dialog, e.g. a command's output. */
    showOutput(title: string, text: string): Promise<void>;
  };
  /** Needs the "repo" permission. */
  repo: {
    status(): Promise<Sern.Status>;
    refs(): Promise<Sern.Refs>;
    /** Newest first; `all` includes every branch; `path` limits it to commits that changed that file. */
    log(options?: { limit?: number; all?: boolean; path?: string }): Promise<Sern.Commit[]>;
    commit(id: string): Promise<Sern.CommitDetails>;
    /** The remote's URL, or null if there's no such remote. */
    remoteUrl(name?: string): Promise<string | null>;
    /** Opens the repository at `path` in SERN (in its tab, if it's open already), e.g. one picked in a form's "repo" field. */
    open(path: string): Promise<{ root: string; name: string }>;
  };
  /** Needs the "git" permission. */
  git: {
    /** Runs git in the open repository, e.g. run(["tag", "v1.0"]). See docs/plugins.md for what's refused. */
    run(args: string[]): Promise<Sern.GitOutput>;
  };
  /**
   * Needs the "actions" permission. Runs the user's own Repository custom actions; a plugin
   * picks one by name but can't change its command.
   */
  actions: {
    /** The Repository custom actions the user has set up. */
    list(): Promise<{ name: string }[]>;
    /**
     * Runs the action named `name` (ignoring case) in the open repository, as if the user ran it:
     * it asks for its {input:…} values and confirms if the action says so. Resolves to what it
     * printed; rejects if there's no such action, the user cancels ("You chose not to run it."),
     * or the program fails.
     */
    run(name: string): Promise<string>;
  };
  /**
   * Needs the "scripts" permission. Runs the plugin's own .ps1, .bat or .cmd scripts, listed by
   * name in the manifest's "scripts". One listed as { "path": …, "admin": true } runs as
   * administrator: the user is asked every time, then Windows asks too.
   */
  scripts: {
    /**
     * Runs the script listed as `name` in the open repository (the plugin's folder with none open),
     * after the user agrees. A failing exit code is part of the result. `timeout` is in seconds
     * (1 to 3600, 600 by default). Rejects if the user says no ("You chose not to run it."), the
     * script runs too long, or a batch argument can't be passed safely. In a batch file, read
     * arguments as %1 or "%~1", never a bare %~1 (cmd would run what follows a "&" in them).
     *
     * `show` puts up a panel while it runs: "progress" (a bar; closes when the script succeeds) or
     * "log" (the bar and the output, live; stays open until closed), titled `title` (the script's
     * name by default). The user can stop it there, which rejects with "The script was stopped."
     * The script moves the bar by printing "##sern[progress] 40 Compiling" lines to stdout (a
     * percentage, then a message; with no number the bar just moves); they're left out of stdout.
     */
    run(
      name: string,
      options?: { args?: string[]; timeout?: number; show?: "progress" | "log"; title?: string },
    ): Promise<Sern.GitOutput>;
  };
  /**
   * Needs the "network" permission, and the host listed in the manifest's "network".
   * https only; redirects aren't followed (you get the 3xx). Up to 10 MB back, 30 s per request.
   */
  http: {
    fetch(
      url: string,
      options?: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD"; headers?: Record<string, string>; body?: string },
    ): Promise<Sern.HttpResponse>;
  };
  /** The commit box. No permission needed: the user sees the message before committing. */
  commit: {
    /**
     * Pre-fills the commit message for the open repository, e.g. "ABC-123: Fix login" from the
     * branch's issue. It fills the box while the summary is empty or still the previous template's,
     * and again after each commit. While the summary is the template's, writing the message with
     * AI keeps it and puts the AI's message in the description. null clears it.
     */
    setTemplate(template: { summary: string; body?: string } | null): Promise<void>;
  };
  /** Values kept in the Windows Credential Manager, for tokens and passwords. Removed on uninstall. */
  secrets: {
    /** Null if there's no such secret. Keys: letters, digits, ".", "_" and "-". */
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  /** Needs the "open-url" permission. */
  env: { openUrl(url: string): Promise<void> };
  /** Needs the "clipboard" permission. */
  clipboard: { writeText(text: string): Promise<void> };
  /** This plugin's own saved values, kept between runs (up to 256 KB). */
  storage: {
    get(key: string): Promise<Sern.Json>;
    set(key: string, value: Sern.Json): Promise<void>;
    delete(key: string): Promise<void>;
  };
  events: {
    on<E extends Sern.Event>(event: E, listener: (payload: Sern.EventPayloads[E]) => unknown): { dispose(): void };
  };
};
