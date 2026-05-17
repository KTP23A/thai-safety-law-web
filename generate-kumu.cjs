#!/usr/bin/env node
/**
 * Generate Kumu.io JSON from Thai Safety Law vault
 * Output: kumu-data.json
 */

const fs = require("fs")
const path = require("path")

const CONTENT_DIR = path.join(__dirname, "content")

// Ministry colors for Kumu
const MINISTRY_COLORS = {
  "กระทรวงแรงงาน": "#1565C0",
  "กระทรวงอุตสาหกรรม": "#E65100",
  "กระทรวงมหาดไทย": "#2E7D32",
  "กระทรวงพลังงาน": "#F9A825",
  "กระทรวงสาธารณสุข": "#C62828",
  "กระทรวงคมนาคม": "#4E342E",
  "กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม": "#6A1B9A",
  "กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม": "#00695C",
}

const MINISTRY_EMOJI = {
  "กระทรวงแรงงาน": "👷",
  "กระทรวงอุตสาหกรรม": "🏭",
  "กระทรวงมหาดไทย": "🏛",
  "กระทรวงพลังงาน": "⚡",
  "กระทรวงสาธารณสุข": "🏥",
  "กระทรวงคมนาคม": "🚛",
  "กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม": "☢️",
  "กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม": "🌿",
}

// Parse frontmatter from markdown
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = {}
  match[1].split("\n").forEach((line) => {
    const [key, ...vals] = line.split(":")
    if (key && vals.length) {
      fm[key.trim()] = vals.join(":").trim().replace(/^["']|["']$/g, "")
    }
  })
  return fm
}

// Extract wikilinks [[filename]] from content
function extractWikilinks(content) {
  const links = []
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim())
  }
  return links
}

// Collect all markdown files
function getAllMdFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  fs.readdirSync(dir).forEach((item) => {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory() && !item.startsWith("_") && item !== "pipeline") {
      getAllMdFiles(full, files)
    } else if (item.endsWith(".md") && !item.startsWith("_") && item !== "index.md") {
      files.push(full)
    }
  })
  return files
}

// Main
const allFiles = getAllMdFiles(CONTENT_DIR)
const elements = []
const connections = []
const fileMap = {} // filename (no ext) → element id

// First pass: build elements
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8")
  const fm = parseFrontmatter(content)
  if (!fm.title || !fm.ministry) return

  const filename = path.basename(filePath, ".md")
  const id = filename

  fileMap[filename] = id

  const emoji = MINISTRY_EMOJI[fm.ministry] || ""
  const color = MINISTRY_COLORS[fm.ministry] || "#888888"

  elements.push({
    id,
    label: fm.title.replace(/"/g, ""),
    type: fm.law_type || "กฎหมาย",
    attributes: {
      ministry: `${emoji} ${fm.ministry}`,
      law_type: fm.law_type || "",
      year: fm.year_be || "",
      status: fm.status || "",
      tags: Array.isArray(fm.tags) ? fm.tags.join(", ") : (fm.tags || ""),
      "gazette url": fm.gazette_url || "",
      color,
    },
  })
})

// Second pass: build connections from wikilinks
allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8")
  const filename = path.basename(filePath, ".md")
  const fromId = fileMap[filename]
  if (!fromId) return

  const links = extractWikilinks(content)
  links.forEach((link) => {
    const toId = fileMap[link]
    if (toId && toId !== fromId) {
      // Avoid duplicates
      const exists = connections.find(
        (c) => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
      )
      if (!exists) {
        connections.push({ from: fromId, to: toId, direction: "directed" })
      }
    }
  })
})

// Add ministry hub nodes
Object.entries(MINISTRY_EMOJI).forEach(([ministry, emoji]) => {
  const id = `hub-${ministry}`
  elements.push({
    id,
    label: `${emoji} ${ministry.replace("กระทรวง", "กระทรวง\n")}`,
    type: "กระทรวง",
    attributes: {
      ministry: `${emoji} ${ministry}`,
      color: MINISTRY_COLORS[ministry] || "#888",
      law_type: "กระทรวง",
    },
  })
  // Connect hub to its laws
  elements
    .filter(
      (e) =>
        e.attributes.ministry === `${emoji} ${ministry}` && e.type !== "กระทรวง"
    )
    .forEach((e) => {
      connections.push({ from: id, to: e.id, direction: "directed" })
    })
})

const kumuData = { elements, connections }

fs.writeFileSync(
  path.join(__dirname, "kumu-data.json"),
  JSON.stringify(kumuData, null, 2),
  "utf8"
)

console.log(`✅ Generated kumu-data.json`)
console.log(`   Elements: ${elements.length} (${elements.length - 8} laws + 8 ministry hubs)`)
console.log(`   Connections: ${connections.length}`)
