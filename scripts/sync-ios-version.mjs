import { readFile, writeFile } from 'node:fs/promises'
const repositoryRoot = new URL('../', import.meta.url)
const manifestPath = new URL('apps/ios/package.json', repositoryRoot)
const projectPath = new URL('apps/ios/project.yml', repositoryRoot)
const checkOnly = process.argv.includes('--check')

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const version = manifest.version

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('apps/ios/package.json must contain a stable three-part numeric version.')
}

const project = await readFile(projectPath, 'utf8')
const versionPattern = /^(\s*MARKETING_VERSION:\s*)(\S+)(\s*)$/m
const versionDefinitions = project.match(/^\s*MARKETING_VERSION:\s*\S+\s*$/gm) ?? []
const match = project.match(versionPattern)

if (!match || versionDefinitions.length !== 1) {
  throw new Error('apps/ios/project.yml must define MARKETING_VERSION exactly once.')
}

if (match[2] === version) {
  console.log(`iOS marketing version is ${version}.`)
  process.exit(0)
}

if (checkOnly) {
  throw new Error(`iOS version mismatch: package.json is ${version}, project.yml is ${match[2]}.`)
}

const updatedProject = project.replace(versionPattern, `$1${version}$3`)
await writeFile(projectPath, updatedProject)
console.log(`Updated iOS marketing version from ${match[2]} to ${version}.`)
