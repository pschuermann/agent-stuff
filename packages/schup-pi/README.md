# schup-pi

Personal Pi package for Pirmin Schuermann's extensions, skills, and helper scripts.

This package intentionally uses natural command names rather than a `schup-` command prefix. If a command collides with `mitsupi`, either patch/filter the `mitsupi` command or accept Pi's numeric suffixes for duplicate extension commands.

## Install locally

```sh
pi install /Users/pschuermann/repos/agent-stuff/packages/schup-pi
```

For local development from this repo, keep the package path in Pi settings rather than copying files into `~/.pi/agent`.

## Claude Code skill access

Claude Code does not consume Pi packages directly. Keep using symlinks into `~/.claude/skills`, but point schup-owned skills at:

```text
/Users/pschuermann/repos/agent-stuff/packages/schup-pi/skills/<skill-name>
```

Root `mitsupi` skills that you still want in Claude Code can continue to be symlinked from:

```text
/Users/pschuermann/repos/agent-stuff/skills/<skill-name>
```

## Dependency note

Some skills include helper scripts with Node/Python dependencies. For this local package, dependencies are declared in the package root so scripts can resolve modules from `packages/schup-pi/node_modules` after `npm install` in this directory.
