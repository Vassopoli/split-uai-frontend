#!/usr/bin/env node
// Reads coverage/coverage-summary.json (produced by `npm run test:coverage`,
// via the `json-summary` reporter in vite.config.ts) and writes a flat
// shields.io-style SVG badge to .github/badges/coverage.svg. No network
// calls and no external badge service — the badge is a plain static file
// committed to the repo and referenced by README.md via a relative path.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

const summaryPath = 'coverage/coverage-summary.json'
const outPath = '.github/badges/coverage.svg'

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
const pct = summary.total.statements.pct
const label = 'coverage'
const value = `${pct.toFixed(1)}%`

function colorFor(pct) {
  if (pct >= 80) return '#4c1' // green
  if (pct >= 60) return '#97ca00' // yellow-green
  if (pct >= 40) return '#dfb317' // yellow
  if (pct >= 20) return '#fe7d37' // orange
  return '#e05d44' // red
}

// Widths are approximated the same way shields.io does: ~6.5px per
// character at the badge's font size, plus fixed padding per side.
function textWidth(text) {
  return Math.round(text.length * 6.5) + 10
}

const labelWidth = textWidth(label)
const valueWidth = textWidth(value)
const totalWidth = labelWidth + valueWidth
const color = colorFor(pct)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`

mkdirSync('.github/badges', { recursive: true })
writeFileSync(outPath, svg)
console.log(`Wrote ${outPath} (${value})`)
