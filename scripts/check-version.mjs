import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const version = JSON.parse(read('package.json')).version
const config = JSON.parse(read('src-tauri/tauri.conf.json')).version
const cargo = read('src-tauri/Cargo.toml').match(/^version = "([^"]+)"/m)?.[1]
const lock = read('src-tauri/Cargo.lock').match(/\[\[package\]\]\r?\nname = "keyboard-test-utility"\r?\nversion = "([^"]+)"/)?.[1]
if (!/^\d+\.\d+\.\d+$/.test(version) || [config, cargo, lock].some(value => value !== version)) throw new Error('Version files must match')
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${version}`) throw new Error('Release tag does not match version')
console.log(`Version ${version}`)
