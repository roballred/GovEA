/**
 * Print cover sheet (#559).
 *
 * Renders only when printing (via the `.print-only` utility in globals.css).
 * On screen it's invisible. On a handout it sits as the first thing
 * stakeholders see — meeting the persona need for "as of <date>"
 * attribution suitable for budget hearings or oversight sessions.
 *
 * Plain-language by design: no jargon, no internal-EA terminology.
 * The Department Director / Elected Official personas read this, not
 * the EA team.
 */
export function PrintCoverSheet({
  orgName,
  title,
  asOf = new Date(),
  confidenceLine,
}: {
  orgName: string
  title: string
  asOf?: Date
  confidenceLine?: string | null
}) {
  return (
    <div className="print-only" style={{ pageBreakAfter: 'always', padding: '2rem 0' }}>
      <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{orgName}</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{title}</h1>
      <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
        As of {asOf.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      {confidenceLine && (
        <p style={{ fontSize: 12, color: '#555', marginTop: '1rem', maxWidth: '60ch' }}>
          {confidenceLine}
        </p>
      )}
    </div>
  )
}
