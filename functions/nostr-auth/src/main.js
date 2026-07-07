/**
 * Catch402 — Nostr Auth Function
 * 
 * Verifies a NIP-98 signed HTTP Auth event (kind 27235) from the client,
 * finds or creates a user profile in the catch402 database,
 * then returns an Appwrite custom token that the client uses to create a session.
 * 
 * Expected body:
 * {
 *   "event": { "id": "...", "pubkey": "...", "created_at": ..., "kind": 27235, "tags": [...], "content": "", "sig": "..." }
 * }
 */

import { Client, Users, Databases, ID, Query } from 'node-appwrite'

const DB_ID = process.env.CATCH402_DB_ID || '6a4d40e8001f57c90358'

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)

  const users = new Users(client)
  const databases = new Databases(client)

  // Parse body
  let event
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    event = body.event
  } catch (e) {
    return res.json({ success: false, error: 'Invalid request body' }, 400)
  }

  if (!event) {
    return res.json({ success: false, error: 'Missing event field' }, 400)
  }

  // Validate kind
  if (event.kind !== 27235) {
    return res.json({ success: false, error: 'Invalid event kind. Expected 27235 (NIP-98)' }, 400)
  }

  // Validate timestamp freshness (±60 seconds)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - event.created_at) > 60) {
    return res.json({ success: false, error: 'Event timestamp is too old or too far in the future' }, 400)
  }

  // Verify signature using native Web Crypto (nostr-tools/pure uses SubtleCrypto)
  try {
    const { verifyEvent } = await import('nostr-tools/pure')
    const isValid = verifyEvent(event)
    if (!isValid) {
      return res.json({ success: false, error: 'Invalid event signature' }, 401)
    }
  } catch (e) {
    error('Signature verification failed: ' + e.message)
    return res.json({ success: false, error: 'Signature verification error' }, 500)
  }

  const npub = event.pubkey
  log(`Verified NIP-98 event from pubkey: ${npub.slice(0, 16)}...`)

  // Find or create user
  let appwriteUserId

  try {
    const rows = await databases.listDocuments(DB_ID, 'users', [
      Query.equal('nostrPubkey', npub),
      Query.limit(1),
    ])

    if (rows.documents.length > 0) {
      appwriteUserId = rows.documents[0].userId
      log(`Found existing user: ${appwriteUserId}`)
    } else {
      // Create new Appwrite user
      const newUser = await users.create(ID.unique(), undefined, undefined, `nostr:${npub.slice(0, 12)}`)
      appwriteUserId = newUser.$id

      // Create user profile row
      await databases.createDocument(DB_ID, 'users', appwriteUserId, {
        userId: appwriteUserId,
        username: `nostr_${npub.slice(0, 12)}`,
        displayName: `Nostr User`,
        nostrPubkey: npub,
        isActive: true,
        createdAt: new Date().toISOString(),
      })

      log(`Created new user: ${appwriteUserId} for pubkey ${npub.slice(0, 16)}...`)
    }
  } catch (e) {
    error('DB error: ' + e.message)
    return res.json({ success: false, error: 'Database error' }, 500)
  }

  // Create Appwrite custom token
  try {
    const token = await users.createToken(appwriteUserId, undefined, 60) // 60 second expiry
    log(`Created custom token for user ${appwriteUserId}`)

    return res.json({
      success: true,
      userId: appwriteUserId,
      secret: token.secret,
    })
  } catch (e) {
    error('Token creation failed: ' + e.message)
    return res.json({ success: false, error: 'Failed to create auth token' }, 500)
  }
}
