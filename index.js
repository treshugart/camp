#! /usr/bin/env node
// @flow

const execa = require("execa");
const fs = require("fs");
const globAll = require("glob-all");
const meow = require("meow");
const minimatch = require("minimatch");
const os = require("os");
const path = require("path");
const readPkgUp = require("read-pkg-up");
const { promisify } = require("util");

const NM = "node_modules";

async function getCurrentWorkspace() {
  const scope = await getScope();
  const basename = path.basename(process.cwd());
  return scope ? path.join(scope, basename) : basename;
}

async function getDependencies() {
  const { pkg } = await readPkgUp();
  return Object.keys({
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.optionalDependencies,
    ...pkg.peerDependencies
  });
}

async function getFilteredDependencies() {
  const dependencies = await getDependencies();
  const workspaces = await getWorkspaces();
  return workspaces.reduce((reduced, workspace) => {
    dependencies.forEach(dep => {
      if (minimatch(dep, workspace)) {
        reduced.push(dep);
      }
    });
    return reduced;
  }, []);
}

async function getFilteredWorkspaces() {
  const cwd = await getRootDirectory();
  const workspaces = await getWorkspaces();
  workspaces.push(`!${await getCurrentWorkspace()}`);
  return await new Promise(res =>
    globAll(workspaces, { cwd }, (e, r) => res(r))
  );
}

async function getPackageInfo(name /*:string*/) {
  try {
    // $FlowFixMe - require string literal
    return require(path.join(process.cwd(), NM, name, "package.json"));
  } catch (e) {
    return await getPackageInfoFromNpm(name);
  }
}

async function getPackageInfoFromNpm(name /*:string*/) {
  const { stdout } = await execa("npm", ["info", name, "--json"]);
  return JSON.parse(stdout);
}

async function getWorkspacesNeededToInstall() {
  const dependencies = await getFilteredDependencies();
  const workspaces = await getFilteredWorkspaces();
  return dependencies.filter(dep => {
    return workspaces.indexOf(dep) === -1;
  });
}

async function getRootDirectory() {
  return (await getScope())
    ? path.resolve(process.cwd(), "..", "..")
    : path.resolve(process.cwd(), "..");
}

async function getScope() {
  const { pkg } = await readPkgUp();
  if (pkg.name[0] === "@") {
    return pkg.name.split("/")[0];
  }
}

async function getWorkspaces() {
  const { pkg } = await readPkgUp();
  if (pkg.workspaces) {
    return pkg.workspaces;
  }
  const scope = await getScope();
  if (scope) {
    return [`${scope}/*`];
  }
  return [];
}

async function installWorkspace(workspace) {
  const cwd = process.cwd();
  const root = await getRootDirectory();
  const { repository } = await getPackageInfo(workspace);
  const repositoryUrl = repository.url.replace("git+", "");
  if (repository.type === "git") {
    console.info(`Installing ${workspace}`);
    await execa("git", ["clone", repositoryUrl], { cwd: root });
    await execa("npm", ["link"], { cwd: path.join(root, workspace) });
    await execa("npm", ["link", workspace], { cwd });
  } else {
    console.warn(
      `Cannot install ${workspace} because it is not a Git repository.`
    );
  }
}

(async () => {
  const workspaces = await getWorkspacesNeededToInstall();
  if (workspaces.length) {
    await Promise.all(workspaces.map(installWorkspace));
  } else {
    console.info("Everything up to date!");
  }
})();
