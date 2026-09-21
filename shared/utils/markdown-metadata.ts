const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const tag of tags) {
    const value = tag.trim().replace(/^#+/, '').trim().slice(0, 32)
    const key = value.toLocaleLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    result.push(value)
    if (result.length === 12) break
  }

  return result
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function tagsFromMarkdown(content: string): string[] {
  const match = content.match(frontmatterPattern)
  if (!match?.[1]) return []

  const lines = match[1].split(/\r?\n/)
  const tagLineIndex = lines.findIndex(line => /^tags\s*:/i.test(line))
  if (tagLineIndex === -1) return []

  const inlineValue = lines[tagLineIndex]!.replace(/^tags\s*:\s*/i, '').trim()
  if (inlineValue) {
    const value = inlineValue.startsWith('[') && inlineValue.endsWith(']')
      ? inlineValue.slice(1, -1)
      : inlineValue
    return normaliseTags(value.split(/[,，]/).map(unquote))
  }

  const tags: string[] = []
  for (let index = tagLineIndex + 1; index < lines.length; index++) {
    const item = lines[index]!.match(/^\s+-\s+(.+)$/)
    if (!item) break
    tags.push(unquote(item[1]!))
  }
  return normaliseTags(tags)
}

export function stripFrontmatter(content: string): string {
  return content.replace(frontmatterPattern, '')
}

export function setMarkdownTags(content: string, nextTags: string[]): string {
  const tags = normaliseTags(nextTags)
  const match = content.match(frontmatterPattern)

  if (!match) {
    if (!tags.length) return content
    return `---\ntags: [${tags.map(tag => JSON.stringify(tag)).join(', ')}]\n---\n${content}`
  }

  const lines = (match[1] || '').split(/\r?\n/)
  const tagLineIndex = lines.findIndex(line => /^tags\s*:/i.test(line))

  if (tagLineIndex >= 0) {
    let deleteCount = 1
    while (/^\s+-\s+/.test(lines[tagLineIndex + deleteCount] || '')) deleteCount++
    lines.splice(tagLineIndex, deleteCount, ...(tags.length ? [`tags: [${tags.map(tag => JSON.stringify(tag)).join(', ')}]`] : []))
  }
  else if (tags.length) {
    lines.push(`tags: [${tags.map(tag => JSON.stringify(tag)).join(', ')}]`)
  }

  const metadata = lines.filter(line => line.trim()).join('\n')
  const body = content.slice(match[0].length)
  return metadata ? `---\n${metadata}\n---\n${body}` : body
}
