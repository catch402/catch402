/**
 * Appwrite SERVER-SIDE client (node-appwrite)
 * Only used in Server Actions and API routes — never imported in 'use client' files.
 */
import { Client, Users, Databases, ID, Query } from 'node-appwrite'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a4d40510012c8d5924b'
const API_KEY = process.env.APPWRITE_API_KEY || ''

export const DB_ID = process.env.NEXT_PUBLIC_CATCH402_DB_ID || '6a4d40e8001f57c90358'

export const TABLES = {
  USERS: 'users',
  ROUTE_WATCHES: 'route_watches',
  PAYMENT_EVENTS: 'payment_events',
  EGRESS_CONFIGS: 'egress_configs',
} as const

/** Server client with admin API key — for server actions */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY)

  return {
    client,
    users: new Users(client),
    databases: new Databases(client),
  }
}

export { ID, Query }
