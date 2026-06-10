import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@/lib/rbac'

// Slices A + B of #614 — stakeholder-facing landing that explains what GovEA
// is, what is shipped vs maturing, and who it is for. Slice B adds the
// "Start here" CTA strip so first-time readers can jump directly to the
// surfaces that match their role. Slice C will add the live priorities tile.
//
// CTAs are role-gated so Viewers never see admin-only routes (#614 acceptance
// criterion). No admin-only configuration details surfaced in any role.

type Status = 'shipped' | 'partial' | 'planned'

const STATUS_LABEL: Record<Status, string> = {
  shipped: 'Shipped',
  partial: 'Maturing',
  planned: 'Planned',
}

const STATUS_CLASS: Record<Status, string> = {
  shipped:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  partial:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
  planned:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

type Tile = { title: string; description: string; status: Status }

const CAPABILITY_TILES: Tile[] = [
  {
    title: 'Mission-first traceability',
    description:
      'Personas connect to capabilities, capabilities connect to applications. Every application traces back to a real person it serves.',
    status: 'shipped',
  },
  {
    title: 'Portfolio and capability mapping',
    description:
      'Catalogue applications, services, capabilities, value streams, objectives, initiatives, and decisions in one place.',
    status: 'shipped',
  },
  {
    title: 'Impact analysis',
    description:
      'See what depends on what before changing or retiring something. Surfaces decommission consequences directly from existing relationships.',
    status: 'shipped',
  },
  {
    title: 'Plain-language reports',
    description:
      'Generated Architecture Vision, Executive Summary, Heatmap Analysis, and TOGAF Application Landscape outputs from existing repository content.',
    status: 'shipped',
  },
  {
    title: 'Stakeholder traceability views',
    description:
      'Read-only objective, capability, and service traces that connect mission context to applications, initiatives, and related records.',
    status: 'shipped',
  },
  {
    title: 'Guided answers',
    description:
      'Type a question; get a briefing-style answer that pulls together capabilities, services, technology, initiatives, and objectives.',
    status: 'shipped',
  },
  {
    title: 'Data architecture',
    description:
      'Entities, attributes, business keys, semantic relationships, and a Chen-notation diagram for data-architecture work.',
    status: 'shipped',
  },
  {
    title: 'Starter content',
    description:
      'EasyEA starter content and empty-state prompts so new practices have a credible first repository to learn from.',
    status: 'shipped',
  },
  {
    title: 'CSV import and export',
    description:
      'Round-trip portfolio data for Applications, Capabilities, Personas, ADRs, Initiatives, and Objectives without schema changes.',
    status: 'shipped',
  },
  {
    title: 'Audit trail',
    description:
      'Immutable before/after log of every change, enforced at the database. Cannot be retroactively edited, including by administrators.',
    status: 'shipped',
  },
  {
    title: 'Single sign-on and role-based access',
    description:
      'OIDC SSO with pre-provisioned access. Admin, Contributor, and Viewer roles map to what each person needs to see and do.',
    status: 'shipped',
  },
  {
    title: 'Multi-agency federation',
    description:
      'Prototype connections between organizations with approval-based cross-org links and write-protection enforcement.',
    status: 'shipped',
  },
]

const MATURING_ITEMS: Tile[] = [
  {
    title: 'Email transport',
    description:
      'Email configuration UI is in place and the change-notification substrate is wired up. Actual SMTP sending is still on hold until an outbound mail account is available.',
    status: 'partial',
  },
  {
    title: 'Architecture Decision Record authoring',
    description:
      'Create, edit, link, and detail-view work today. The richer authoring experience is still maturing relative to the core portfolio records.',
    status: 'partial',
  },
  {
    title: 'Long-form editing',
    description:
      'Markdown renders on detail pages. Editing still uses plain textareas; a richer toolbar and preview workflow are planned.',
    status: 'partial',
  },
  {
    title: 'Repository portability beyond CSV',
    description:
      'Six entity types support CSV round-trips today. Services, Value Streams, Principles, Glossary, and Data Architecture exports are still ahead.',
    status: 'partial',
  },
  {
    title: 'Data architecture quality cues',
    description:
      'Data Vault naming hints are shipped. Row-level quality cues and a scorecard summary are scoped but not yet built.',
    status: 'partial',
  },
  {
    title: 'Traceable release pipeline',
    description:
      'Demo deploys still rely on manual steps. A pipeline that ties each deploy to a specific commit, image, and smoke-test result is planned.',
    status: 'planned',
  },
  {
    title: 'Public-read access for stakeholders',
    description:
      'Signed-in viewers land on a stakeholder-friendly page today. An optional public-read mode for non-authenticated readers is in design.',
    status: 'planned',
  },
]

type Persona = { name: string; role: string }

const PERSONAS: Persona[] = [
  { name: 'Department Director', role: 'Wants the big picture without reading EA jargon.' },
  { name: 'Elected Official', role: 'Needs concise, plain-language outputs.' },
  { name: 'Enterprise Architect', role: 'Owns the repository; sets the modelling baseline.' },
  { name: 'Agency EA Coordinator', role: 'Bridges agency work into the broader portfolio.' },
  { name: 'Junior EA / Analyst', role: 'Learning on the job; needs guardrails and clear authoring paths.' },
  { name: 'Domain Architect', role: 'Owns a slice of the repository (data, security, integration, etc.).' },
  { name: 'Business Stakeholder', role: 'Reads outputs; doesn&apos;t edit content.' },
  { name: 'Consultant / Systems Integrator', role: 'Kicks off practices and hands off repositories.' },
  { name: 'Early-Maturity Practice Lead', role: 'Standing up an EA practice for the first time.' },
  { name: 'Programme Director', role: 'Watches initiatives and capability adoption across the portfolio.' },
  { name: 'Data Modeler / Enterprise Data Architect', role: 'Works in the data-architecture module.' },
  { name: 'Budget and Performance Analyst', role: 'Connects financial signals back to the portfolio.' },
  { name: 'Content Viewer', role: 'Non-authoring reader; broad category of stakeholders.' },
  { name: 'CMS Administrator', role: 'Manages users, roles, and org settings.' },
  { name: 'Instance Administrator', role: 'Runs the platform across organizations.' },
]

// ── Coming next: top product priorities ──────────────────────────────────────
//
// Mirrors the top-five table in `docs/product-priorities.md`. Update this list
// whenever the doc changes. The doc is the source of truth; this is the
// in-product reflection.

type Priority = {
  rank: number
  title: string
  why: string
  refs: string[]
}

const PRIORITIES_LAST_GROOMED = '2026-06-10'

const PRIORITIES: Priority[] = [
  {
    rank: 1,
    title: 'Run the first persona-validation Tier-1 interview',
    why: 'Third grooming cycle at rank 1 with zero movement: the feedback log is still empty and all 16 personas remain Assumed. Concrete new candidate: the OCIO design-review contact — pair the compliance conversation with a 30-minute practice-fit interview. Until one Tier-1 conversation lands, several differentiator items stay parked.',
    refs: ['#668'],
  },
  {
    rank: 2,
    title: 'Make sign-out reliable from every URL',
    why: 'A live auth bug observed by a real demo user, spanning three journeys. Also the last open issue in v0.9 — Foundation Cleanup retires when it lands. Bugs real users hit outrank new design work.',
    refs: ['#759'],
  },
  {
    rank: 3,
    title: 'Security/compliance wave for the OCIO review',
    why: 'OCIO 141.10 MFA, RCW 40.14 audit retention, CSP enforcement, CSV formula injection, DB TLS, CI scanning, and a compliance documentation pack — adoption gates for government use, not polish. Cheap high-leverage items first; the doc pack and retention design feed the external OCIO design review directly.',
    refs: ['#761–#769'],
  },
  {
    rank: 4,
    title: 'REST API foundation (design slice first)',
    why: 'The 2026-06-10 roadmap decision made integration with external systems of record foundational and pulled the API layer into v1.0. Design the endpoint inventory and token/RBAC/audit/versioning rules first; the ServiceNow ITSM/CMDB slice (v2.0) is the known first consumer keeping the contract honest.',
    refs: ['#775', '#382'],
  },
  {
    rank: 5,
    title: 'Close out the TOGAF recipe arc',
    why: 'The implementation slices shipped; finish the remaining engine scope, then walk the epic and design issues against their acceptance criteria and close or re-scope them explicitly. A shipped epic left open is a false-open that hides real progress from every future grooming.',
    refs: ['#671', '#665', '#313'],
  },
]

// ── "Start here" CTAs ────────────────────────────────────────────────────────
//
// Each CTA points at a route the user can actually reach. `minRole` is the
// least-privileged role allowed to see the link, evaluated against the rank
// order viewer < contributor < admin. This mirrors the sidebar's gating
// (#548): Viewers never see admin-only routes; Contributors never see
// admin-only configuration; the audit log is contributor+ per #597/#603.

type CtaCategory = 'read' | 'contribute' | 'administer'

type Cta = {
  href: string
  title: string
  description: string
  minRole: Role
  category: CtaCategory
}

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  contributor: 1,
  admin: 2,
}

const CTAS: Cta[] = [
  {
    href: '/executive',
    title: 'Executive Summary',
    description: 'Leadership-ready snapshot of the portfolio, capabilities, and initiatives.',
    minRole: 'viewer',
    category: 'read',
  },
  {
    href: '/answers',
    title: 'Ask a question',
    description: 'Type a plain-language question; get a briefing-style answer drawn from the repository.',
    minRole: 'viewer',
    category: 'read',
  },
  {
    href: '/capabilities',
    title: 'Browse capabilities',
    description: 'The capability catalogue &mdash; the heart of the people-first traceability chain.',
    minRole: 'viewer',
    category: 'read',
  },
  {
    href: '/applications',
    title: 'Browse applications',
    description: 'The application portfolio, with lifecycle and risk signals at the list level.',
    minRole: 'viewer',
    category: 'read',
  },
  {
    href: '/dashboard',
    title: 'Practitioner dashboard',
    description: 'Repository activity, coverage signals, and review-health for active EA work.',
    minRole: 'contributor',
    category: 'contribute',
  },
  {
    href: '/audit',
    title: 'Audit log',
    description: 'Immutable before/after history of architecture-content changes.',
    minRole: 'contributor',
    category: 'contribute',
  },
  {
    href: '/users',
    title: 'Manage users',
    description: 'Create, edit, and assign roles for people in this organization.',
    minRole: 'admin',
    category: 'administer',
  },
  {
    href: '/settings',
    title: 'Organization settings',
    description: 'Workspace settings: theme, enabled modules, and tenancy controls.',
    minRole: 'admin',
    category: 'administer',
  },
]

const CATEGORY_LABEL: Record<CtaCategory, string> = {
  read: 'Read & explore',
  contribute: 'Contribute',
  administer: 'Administer',
}

function CtaCard({ cta }: { cta: Cta }) {
  return (
    <Link
      href={cta.href}
      className="group flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground group-hover:text-primary">
          {cta.title}
        </div>
        <div
          className="text-xs text-muted-foreground leading-relaxed"
          // Allow &mdash; in the description copy without breaking JSX rules.
          dangerouslySetInnerHTML={{ __html: cta.description }}
        />
      </div>
      <span
        aria-hidden
        className="mt-0.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      >
        &rarr;
      </span>
    </Link>
  )
}

export default async function OverviewPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role: Role = session.user.role
  const userRank = ROLE_RANK[role]
  const visibleCtas = CTAS.filter(c => userRank >= ROLE_RANK[c.minRole])
  const ctaCategoriesInOrder: CtaCategory[] = ['read', 'contribute', 'administer']
  const ctasByCategory = ctaCategoriesInOrder
    .map(cat => ({ category: cat, items: visibleCtas.filter(c => c.category === cat) }))
    .filter(group => group.items.length > 0)

  const shipped = CAPABILITY_TILES.filter(t => t.status === 'shipped')

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-12">
      {/* ── What GovEA is ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          GovEA at a glance
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          GovEA is a free, open-source enterprise architecture tool built for
          state and local government. It catalogues an agency&apos;s applications,
          services, capabilities, and decisions, and traces each of them back
          to a real person it serves &mdash; not just a technology inventory.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          The product is organised around a people-first chain:{' '}
          <span className="font-medium text-foreground">
            personas &rarr; capabilities &rarr; applications
          </span>
          . Everything else &mdash; services, objectives, initiatives, decisions,
          data architecture, reports &mdash; layers on top of that chain.
        </p>
      </section>

      {/* ── Start here (role-aware CTAs) ──────────────────────────────────── */}
      <section className="space-y-4" data-testid="overview-start-here">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Start here</h2>
          <p className="text-sm text-muted-foreground">
            Jump straight to the surfaces that match what you can do in this
            workspace.
          </p>
        </div>
        <div className="space-y-5">
          {ctasByCategory.map(group => (
            <div key={group.category} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABEL[group.category]}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map(cta => (
                  <CtaCard key={cta.href} cta={cta} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you can do today ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            What you can do today
          </h2>
          <span className="text-xs text-muted-foreground">
            {shipped.length} capabilities shipped
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {shipped.map(tile => (
            <div
              key={tile.title}
              className="rounded-lg border border-border bg-card p-4 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {tile.title}
                </h3>
                <StatusBadge status={tile.status} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tile.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What is still maturing ────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          What is still maturing
        </h2>
        <p className="text-sm text-muted-foreground">
          These are areas where the foundation is in place but the experience
          is still being built out, or where work is scoped and queued.
        </p>
        <ul className="space-y-3">
          {MATURING_ITEMS.map(item => (
            <li
              key={item.title}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Coming next (top priorities) ──────────────────────────────────── */}
      <section className="space-y-4" data-testid="overview-coming-next">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">Coming next</h2>
          <span className="text-xs text-muted-foreground">
            Top priorities, last groomed {PRIORITIES_LAST_GROOMED}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          The current shortlist of next product moves. Mirrors{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">
            docs/product-priorities.md
          </code>
          , which is the source of truth.
        </p>
        <ol className="space-y-3">
          {PRIORITIES.map(p => (
            <li
              key={p.rank}
              className="flex gap-4 rounded-lg border border-border bg-card p-4"
            >
              <span
                aria-label={`Rank ${p.rank}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground"
              >
                {p.rank}
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {p.title}
                  </h3>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {p.refs.join(' · ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.why}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Who it is for ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Who it is for
        </h2>
        <p className="text-sm text-muted-foreground">
          GovEA is designed around the people who actually do enterprise
          architecture work in government &mdash; from elected officials and
          department directors reading outputs to data modelers and junior
          analysts contributing content.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PERSONAS.map(p => (
            <li
              key={p.name}
              className="rounded-md border border-border bg-card px-3 py-2"
            >
              <div className="text-sm font-medium text-foreground">{p.name}</div>
              <div className="text-xs text-muted-foreground leading-snug">
                {p.role}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <section className="border-t border-border pt-6">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This overview reflects what is in the product today. For the
          authoritative capability inventory see{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">
            capabilities.md
          </code>{' '}
          in the repository.
        </p>
      </section>
    </div>
  )
}
