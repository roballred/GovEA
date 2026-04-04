export interface TaxonomyNode {
  id: string
  name: string
  slug: string
  parentId?: string
  children?: TaxonomyNode[]
}

export function buildTree(flat: TaxonomyNode[]): TaxonomyNode[] {
  const map = new Map(flat.map((n) => [n.id, { ...n, children: [] as TaxonomyNode[] }]))
  const roots: TaxonomyNode[] = []
  for (const node of map.values()) {
    if (node.parentId) {
      map.get(node.parentId)?.children?.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}
