export type CapNode = {
  id: string
  domain: string | null
  childRelationships: { parentId: string; childId: string }[]
  parentRelationships: { parentId: string; childId: string }[]
}

export type CapTreeNode<T extends CapNode> = {
  cap: T
  depth: number
  children: CapTreeNode<T>[]
}

/** Resolve effective domain by walking up to the nearest ancestor that has one. */
export function resolveCapabilityDomain(capId: string, byId: Map<string, CapNode>): string | null {
  const visited = new Set<string>()
  let id: string | undefined = capId
  while (id && !visited.has(id)) {
    visited.add(id)
    const cap = byId.get(id)
    if (!cap) return null
    if (cap.domain) return cap.domain
    id = cap.parentRelationships[0]?.parentId
  }
  return null
}

/** Build a tree from a flat list. Caps with no parent in the list become roots. */
export function buildCapabilityTree<T extends CapNode>(caps: T[]): CapTreeNode<T>[] {
  const byId = new Map(caps.map(c => [c.id, c]))
  const childIds = new Set(caps.flatMap(c => c.childRelationships.map(r => r.childId)))
  const roots = caps.filter(c => !childIds.has(c.id))

  function buildNode(cap: T, depth: number): CapTreeNode<T> {
    const children = cap.childRelationships
      .map(r => byId.get(r.childId))
      .filter((c): c is T => c !== undefined)
      .map(c => buildNode(c, depth + 1))
    return { cap, depth, children }
  }

  return roots.map(r => buildNode(r, 0))
}

/** Flatten a tree to a depth-annotated list in display order. */
export function flattenTree<T extends CapNode>(nodes: CapTreeNode<T>[], collapsed: Set<string>): CapTreeNode<T>[] {
  const result: CapTreeNode<T>[] = []
  function walk(node: CapTreeNode<T>) {
    result.push(node)
    if (!collapsed.has(node.cap.id)) {
      node.children.forEach(walk)
    }
  }
  nodes.forEach(walk)
  return result
}

/** Collect all descendant IDs of a capability (to prevent cycle creation). */
export function collectDescendantIds(capId: string, byId: Map<string, CapNode>): Set<string> {
  const result = new Set<string>()
  const queue = [capId]
  while (queue.length > 0) {
    const id = queue.pop()!
    const cap = byId.get(id)
    if (!cap) continue
    for (const rel of cap.childRelationships) {
      if (!result.has(rel.childId)) {
        result.add(rel.childId)
        queue.push(rel.childId)
      }
    }
  }
  return result
}
