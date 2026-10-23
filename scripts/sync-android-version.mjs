import { readFile, writeFile } from 'node:fs/promises'

const repositoryRoot = new URL('../', import.meta.url)
const manifestPath = new URL('apps/android/package.json', repositoryRoot)
const versionPath = new URL('apps/android/version.properties', repositoryRoot)
const checkOnly = process.argv.includes('--check')

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const version = manifest.version

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('apps/android/package.json must contain a stable three-part numeric version.')
}

const properties = await readFile(versionPath, 'utf8')
const versionPattern = /^(VERSION_NAME=)(\S+)(\s*)$/m
const definitions = properties.match(/^VERSION_NAME=\S+\s*$/gm) ?? []
const match = properties.match(versionPattern)

if (!match || definitions.length !== 1) {
  throw new Error('apps/android/version.properties must define VERSION_NAME exactly once.')
}

if (match[2] === version) {
  console.log(`Android version name is ${version}.`)
  process.exit(0)
}

if (checkOnly) {
  throw new Error(
    `Android version mismatch: package.json is ${version}, version.properties is ${match[2]}.`,
  )
}

const updated = properties.replace(versionPattern, `$1${version}$3`)
await writeFile(versionPath, updated)
console.log(`Updated Android version name from ${match[2]} to ${version}.`)
