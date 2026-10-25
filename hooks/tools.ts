// The words of the tool rows the mod draws: a collapsed group's one line
// ("Ran 2 shell commands, read 3 files") and a call's header ("Read" and
// the file it read). Plain functions, so the tests drive them directly.

type Call = { tool: string; input: unknown; isErrored: boolean }

// What a group's line says per tool: the verb, then the thing counted.
const VERBS: Record<string, [string, string, string]> = {
  Bash: ['ran', 'shell command', 'shell commands'],
  Read: ['read', 'file', 'files'],
  Edit: ['edited', 'file', 'files'],
  MultiEdit: ['edited', 'file', 'files'],
  Write: ['wrote', 'file', 'files'],
  NotebookEdit: ['edited', 'notebook', 'notebooks'],
  Grep: ['searched for', 'pattern', 'patterns'],
  Glob: ['searched for', 'pattern', 'patterns'],
  WebFetch: ['fetched', 'page', 'pages'],
  WebSearch: ['ran', 'web search', 'web searches'],
  Agent: ['ran', 'agent', 'agents'],
  Task: ['ran', 'agent', 'agents'],
}

/** A collapsed group's line: what its calls did, counted, in first-seen order. */
export function groupSummary(calls: readonly Call[]): string {
  const counts = new Map<string, { verb: string; one: string; many: string; known: boolean; n: number }>()
  for (const call of calls) {
    const known = call.tool in VERBS
    const [verb, one, many] = VERBS[call.tool] ?? ['used', call.tool, call.tool]
    const key = `${verb} ${many}`
    const entry = counts.get(key) ?? { verb, one, many, known, n: 0 }
    entry.n += 1
    counts.set(key, entry)
  }
  // "read 3 files" for the tools above; "used Foo 2 times" for any other
  const parts = [...counts.values()].map(c =>
    c.known ? `${c.verb} ${c.n} ${c.n === 1 ? c.one : c.many}` : `${c.verb} ${c.one} ${c.n === 1 ? 'once' : `${c.n} times`}`,
  )
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** How many of a group's calls failed. */
export function failures(calls: readonly Call[]): number {
  return calls.filter(c => c.isErrored).length
}

// The input field that best says what a call was about, per tool.
const SUBJECT: Record<string, string[]> = {
  Bash: ['description', 'command'],
  Read: ['file_path'],
  Edit: ['file_path'],
  MultiEdit: ['file_path'],
  Write: ['file_path'],
  NotebookEdit: ['notebook_path'],
  Grep: ['pattern'],
  Glob: ['pattern'],
  WebFetch: ['url'],
  WebSearch: ['query'],
  Agent: ['description'],
  Task: ['description'],
}

const MAX_SUBJECT = 90

/**
 * A call's header: the tool's name and what it was about, on one line, and
 * whether that is a path (drawn as a file chip).
 */
export function callHeader(tool: string, input: unknown): { name: string; subject: string; isPath: boolean } {
  const fields = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const key = (SUBJECT[tool] ?? Object.keys(fields)).find(k => typeof fields[k] === 'string' && fields[k] !== '')
  const raw = key === undefined ? '' : (fields[key] as string)
  const line = raw.split('\n')[0].trim()
  const subject = line.length > MAX_SUBJECT ? line.slice(0, MAX_SUBJECT - 1) + '…' : line
  return { name: tool.replace(/^mcp__([^_]+)__/, '$1 · '), subject, isPath: key !== undefined && /path$/.test(key) }
}
