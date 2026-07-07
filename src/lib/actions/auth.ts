/**
 * Catch402 Auth Server Actions
 * All auth flows for Email OTP, OAuth, Passkey, and Nostr.
 * These run on the server — no new API routes created.
 */
'use server'

import { createAdminClient, DB_ID, TABLES, ID } from '@/lib/appwrite/server'
import { cookies } from 'next/headers'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const RP_NAME = 'Catch402'
const RP_ID = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : 'localhost'

// ── Email OTP ──────────────────────────────────────────────────────────────

/**
 * Step 1: Send OTP to email address.
 * Uses Appwrite's built-in email-otp token.
 */
export async function sendEmailOtp(email: string) {
  const { client } = createAdminClient()

  // Use the client SDK from node-appwrite to create the token
  const { Account } = await import('node-appwrite')
  const account = new Account(client)

  try {
    const token = await account.createEmailToken(ID.unique(), email)
    return { success: true, userId: token.userId }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send OTP' }
  }
}

/**
 * Step 2: Verify OTP and create session cookie.
 */
export async function verifyEmailOtp(userId: string, otp: string) {
  const { client, databases, users } = createAdminClient()
  const { Account } = await import('node-appwrite')
  const account = new Account(client)

  try {
    const session = await account.createSession(userId, otp)

    // Upsert user profile row
    const appwriteUser = await users.get(userId)
    await upsertUserRow({
      databases,
      userId,
      email: appwriteUser.email || '',
      displayName: appwriteUser.name || appwriteUser.email?.split('@')[0] || 'User',
    })

    const cookieStore = await cookies()
    cookieStore.set('c402_session', session.$id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return { success: true, session: session.$id }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Invalid OTP' }
  }
}

// ── OAuth (GitHub / Google) ────────────────────────────────────────────────

/**
 * Returns the Appwrite OAuth2 URL for the provider.
 * The client calls window.location.href = url.
 */
export async function getOAuthUrl(provider: 'github' | 'google') {
  const successUrl = `${APP_URL}/auth/callback?provider=${provider}`
  const failureUrl = `${APP_URL}/auth?error=oauth_failed`

  // Construct Appwrite OAuth URL directly
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a4d40510012c8d5924b'

  const url = `${endpoint}/account/sessions/oauth2/${provider}?project=${projectId}&success=${encodeURIComponent(successUrl)}&failure=${encodeURIComponent(failureUrl)}`
  return { url }
}

// ── OAuth callback ─────────────────────────────────────────────────────────

/**
 * Called after OAuth redirect to finalize session.
 * The client SDK already set the session cookie via Appwrite's redirect mechanism.
 * This action just upserts the user profile row.
 */
export async function finalizeOAuthSession(sessionId: string) {
  const { client, users, databases } = createAdminClient()
  const { Account } = await import('node-appwrite')

  try {
    const account = new Account(client)
    // Get user identity via their session — we use admin client
    const allUsers = await users.list()
    // We can't easily look up by sessionId in admin, so we do a lightweight approach:
    // the client will call this with the session cookie already set — read from cookie
    const cookieStore = await cookies()
    cookieStore.set('c402_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

// ── Passkey Registration ───────────────────────────────────────────────────

/**
 * Step 1: Generate passkey registration options.
 */
export async function generatePasskeyRegistrationOptions(userId: string, username: string) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: username,
    userDisplayName: username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  })

  // Store challenge in cookie for verification
  const cookieStore = await cookies()
  cookieStore.set('c402_passkey_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  return { options }
}

/**
 * Step 2: Verify passkey registration and save credential.
 */
export async function verifyPasskeyRegistration(
  userId: string,
  registrationResponse: any
) {
  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get('c402_passkey_challenge')?.value
  if (!expectedChallenge) {
    return { success: false, error: 'Challenge expired' }
  }

  const { databases } = createAdminClient()

  try {
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: APP_URL,
      expectedRPID: RP_ID,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Passkey verification failed' }
    }

    const { credential } = verification.registrationInfo
    const credentialId = Buffer.from(credential.id).toString('base64url')
    const publicKey = Buffer.from(credential.publicKey).toString('base64url')

    // Update user row with passkey data
    await databases.updateDocument(DB_ID, TABLES.USERS, userId, {
      passkeyCredentialId: credentialId,
      passkeyPublicKey: publicKey,
      passkeyCounter: credential.counter,
    })

    cookieStore.delete('c402_passkey_challenge')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Registration failed' }
  }
}

/**
 * Step 1 of passkey login: Generate authentication options.
 */
export async function generatePasskeyAuthOptions(username?: string) {
  const { databases } = createAdminClient()

  let allowCredentials: any[] = []

  if (username) {
    try {
      const rows = await databases.listDocuments(DB_ID, TABLES.USERS, [
        `equal("username", "${username}")`,
      ])
      if (rows.documents.length > 0) {
        const user = rows.documents[0] as any
        if (user.passkeyCredentialId) {
          allowCredentials = [
            {
              id: user.passkeyCredentialId,
              type: 'public-key',
            },
          ]
        }
      }
    } catch {}
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials,
  })

  const cookieStore = await cookies()
  cookieStore.set('c402_passkey_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  return { options }
}

/**
 * Step 2 of passkey login: Verify auth response and create session.
 */
export async function verifyPasskeyAuth(authResponse: any) {
  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get('c402_passkey_challenge')?.value
  if (!expectedChallenge) {
    return { success: false, error: 'Challenge expired' }
  }

  const { databases, users, client } = createAdminClient()

  try {
    // Find user by credentialId
    const credentialId = authResponse.id
    const rows = await databases.listDocuments(DB_ID, TABLES.USERS, [
      `equal("passkeyCredentialId", "${credentialId}")`,
    ])

    if (rows.documents.length === 0) {
      return { success: false, error: 'Passkey not registered' }
    }

    const userRow = rows.documents[0] as any
    const publicKeyBuffer = Buffer.from(userRow.passkeyPublicKey, 'base64url')

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge,
      expectedOrigin: APP_URL,
      expectedRPID: RP_ID,
      credential: {
        id: userRow.passkeyCredentialId,
        publicKey: publicKeyBuffer,
        counter: userRow.passkeyCounter || 0,
      },
    })

    if (!verification.verified) {
      return { success: false, error: 'Passkey auth failed' }
    }

    // Update counter
    await databases.updateDocument(DB_ID, TABLES.USERS, userRow.$id, {
      passkeyCounter: verification.authenticationInfo.newCounter,
    })

    // Create Appwrite custom token for the user and create session
    const { Account } = await import('node-appwrite')
    const account = new Account(client)
    const token = await users.createToken(userRow.userId)
    const session = await account.createSession(userRow.userId, token.secret)

    cookieStore.set('c402_session', session.$id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    cookieStore.delete('c402_passkey_challenge')
    return { success: true, userId: userRow.userId }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Auth failed' }
  }
}

// ── Nostr Custom Token Auth ────────────────────────────────────────────────

/**
 * Verify a NIP-98 signed event from the client and create/return a session.
 * The actual cryptographic verification is done server-side using nostr-tools.
 */
export async function verifyNostrAuth(signedEvent: {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}) {
  const { databases, users, client } = createAdminClient()

  try {
    // Verify NIP-98 kind 27235 (HTTP Auth)
    if (signedEvent.kind !== 27235) {
      return { success: false, error: 'Invalid event kind' }
    }

    // Check timestamp freshness (within 60 seconds)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - signedEvent.created_at) > 60) {
      return { success: false, error: 'Event timestamp too old' }
    }

    // Verify signature using nostr-tools
    const { verifyEvent } = await import('nostr-tools/pure')
    const isValid = verifyEvent(signedEvent as any)
    if (!isValid) {
      return { success: false, error: 'Invalid signature' }
    }

    const npub = signedEvent.pubkey

    // Find or create user
    let userRow: any = null
    try {
      const rows = await databases.listDocuments(DB_ID, TABLES.USERS, [
        `equal("nostrPubkey", "${npub}")`,
      ])
      if (rows.documents.length > 0) {
        userRow = rows.documents[0]
      }
    } catch {}

    let appwriteUserId: string

    if (!userRow) {
      // Create Appwrite user for this nostr pubkey
      const newAppwriteUser = await users.create(
        ID.unique(),
        undefined,
        undefined,
        `nostr:${npub.slice(0, 8)}`
      )
      appwriteUserId = newAppwriteUser.$id

      // Create user profile row
      await databases.createDocument(DB_ID, TABLES.USERS, appwriteUserId, {
        userId: appwriteUserId,
        username: `nostr_${npub.slice(0, 12)}`,
        displayName: `Nostr User`,
        nostrPubkey: npub,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
    } else {
      appwriteUserId = userRow.userId
    }

    // Create Appwrite custom token and session
    const { Account } = await import('node-appwrite')
    const account = new Account(client)
    const token = await users.createToken(appwriteUserId)
    const session = await account.createSession(appwriteUserId, token.secret)

    const cookieStore = await cookies()
    cookieStore.set('c402_session', session.$id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return { success: true, userId: appwriteUserId }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nostr auth failed' }
  }
}

// ── Session / Logout ───────────────────────────────────────────────────────

export async function getServerSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('c402_session')?.value
  if (!sessionId) return null

  try {
    const { client } = createAdminClient()
    const { Account } = await import('node-appwrite')
    // We can't easily get account from session ID with admin client directly
    // Return the raw sessionId for client-side validation
    return { sessionId }
  } catch {
    return null
  }
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete('c402_session')
  return { success: true }
}

// ── Internal Helpers ───────────────────────────────────────────────────────

async function upsertUserRow({
  databases,
  userId,
  email,
  displayName,
  extra = {},
}: {
  databases: any
  userId: string
  email: string
  displayName: string
  extra?: Record<string, any>
}) {
  try {
    await databases.getDocument(DB_ID, TABLES.USERS, userId)
    // Row exists — update
    await databases.updateDocument(DB_ID, TABLES.USERS, userId, {
      displayName,
      ...extra,
    })
  } catch {
    // Row doesn't exist — create
    const username = email
      ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : `user_${userId.slice(0, 8)}`

    await databases.createDocument(DB_ID, TABLES.USERS, userId, {
      userId,
      username,
      email,
      displayName,
      isActive: true,
      createdAt: new Date().toISOString(),
      ...extra,
    })
  }
}
