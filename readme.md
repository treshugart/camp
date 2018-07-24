# Camp

> Camp is an NPM-based, low-config, mono-repo-like workflow for multiple repositories.

Like many other mono-repo solutions, Camp is based on the idea that you want to reduce development friction when having to work on several different packages at once.

_It was created to explore the idea that mono-repos may just not be necessary._

There's a few things it aims to do:

* Automate installation and linking of dependencies that are in the same project.
* Running scripts against multiple workspaces at once.

## Installing

Er... you can't do that yet. This is still experimental and yet to be published.

## Getting started

Let's define two terms we use here:

1. Project - a set of workspaces.
2. Workspace - a single repo within a project.

You start with a single repo and run `camp` inside of it. Camp will then figure out what other workspaces you might be working on, clone them next to your current repo and then link them into your node modules using `npm link`.

When you want to work on a linked workspaces, just run `camp` inside of them and any related workspaces that aren't installed yet will be installed and linked accordingly.

### Scoped packages

By default, your workspaces are derived from your current NPM scope. It looks at your dependencies, and matches them to your current package scope. If it finds any dependencies that are in the same scope, it will install and link them.

Given a `package.json` of:

```json
{
  "@scope/package1",
  "dependencies": {
    "@scope/package2": "*"
  }
}
```

Running `camp` in a directory of `@scope/package1` with the `package.json` above, will install `@scope/package2` next to `@scope/package1` making the folder structure look like:

```
- @scope
  - package1
    - node_modules
      - @scope
        - package2 -> ../../../package2
  - package2
```

### Un-scoped packages

If your package is not scoped, then it won't be able to find anything until you give it some hints via a `workspaces` array in your `package.json`. This is an array of `minimatch` patterns to match against your project's dependencies.

For example, if you do this, it won't match anything:

```json
{
  "package1",
  "dependencies": {
    "package2": "*"
  }
```

But if you add a `workspaces` array, it can:

```json
{
  "package1",
  "dependencies": {
    "package2": "*"
  },
  "workspaces": [
    "package*"
  ]
```

Once it can find matching depenencies, it installs and links the matched workspaces next to your unscoped package.

### Scoped and unscoped workspaces

For scoped packages, if you don't provide a `workspaces` array, it defaults to matching against the current scope. Most mono-repos will have this setup. However, if you need to install and link any dependencies that aren't part of the current setup, then you can still specify `workspaces` and it will override the default scope matching. This works alike for both scoped and unscoped workspaces.

Here's an example of a combination of the examples above:

```json
{
  "@scope/package1",
  "dependencies": {
    "@scope/package2": "*"
  },
  "workspaces": [
    "@scope/*",
    "package*"
  ]
}
```

## Usage

An asterisk (*) means the command is under implementation.

### camp

Installs and links the related workspaces related to the repo in the current working directory.

### `camp install <pattern>` *

Install workspaces for all dependencies matching the `pattern`.

### `camp run <pattern> <command / args>` *

Run a `<command / args>` across related workspaces matching `<pattern>`. To run across _all_ workspaces, use `**` for the `pattern`.

* A single workspace: `camp run my-package npm i`.
* Multiple workspaces: `camp run @scope/* npm i`.
* All workspaces: `camp run ** npm i`.
