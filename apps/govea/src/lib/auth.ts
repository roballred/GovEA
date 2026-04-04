import NextAuth from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // SSO: Microsoft Entra ID (optional — only active when env vars are set)
    ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
            tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID!,
          }),
        ]
      : []),
    // Local: credentials (always available as fallback)
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: validate against hashed password in db
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/error',
  },
})
