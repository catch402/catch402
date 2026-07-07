/**
 * Appwrite CLIENT-SIDE SDK
 * Used in browser components for session-based auth operations.
 */
'use client'

import { Client, Account, Databases, ID, Query } from 'appwrite'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a4d40510012c8d5924b'

export const DB_ID = process.env.NEXT_PUBLIC_CATCH402_DB_ID || '6a4d40e8001f57c90358'

let _client: Client | null = null

export function getClient(): Client {
  if (!_client) {
    _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID)
  }
  return _client
}

export function getAccount(): Account {
  return new Account(getClient())
}

export function getDatabases(): Databases {
  return new Databases(getClient())
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export { ID, Query }
