// Bootstrap the content type registry for GovEA.
// Import this file once at app startup (in layout.tsx or instrumentation.ts).
// Order matters — types that are referenced by other types must be registered first.

import '../content-types/organization'
import '../content-types/persona'
import '../content-types/capability'   // references persona
import '../content-types/application'  // references capability, persona
import '../content-types/adr'          // references capability, application

// Export the registry for use in UI components and API routes
export { registry, defineContentType } from '@govea/core'
