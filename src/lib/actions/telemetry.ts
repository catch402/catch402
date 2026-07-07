/**
 * Route Watch Server Actions
 */
'use server'

import { createAdminClient, DB_ID, TABLES, ID, Query } from '@/lib/appwrite/server'
import { cookies } from 'next/headers'

// ── Route Watches ──────────────────────────────────────────────────────────

export async function createRouteWatch(data: {
  userId: string
  resourcePath: string
  targetAmount?: number
  currency?: string
  webhookUrl?: string
  nostrRelays?: string
}) {
  const { databases } = createAdminClient()
  const watchId = ID.unique()

  try {
    const row = await databases.createDocument(DB_ID, TABLES.ROUTE_WATCHES, watchId, {
      watchId,
      userId: data.userId,
      resourcePath: data.resourcePath,
      derivationIndex: 0,
      targetAmount: data.targetAmount,
      currency: data.currency || 'USDC',
      status: 'active',
      webhookUrl: data.webhookUrl,
      nostrRelays: data.nostrRelays,
      createdAt: new Date().toISOString(),
    })
    return { success: true, watch: row }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

export async function listRouteWatches(userId: string) {
  const { databases } = createAdminClient()

  try {
    const rows = await databases.listDocuments(DB_ID, TABLES.ROUTE_WATCHES, [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(50),
    ])
    return { success: true, watches: rows.documents, total: rows.total }
  } catch (err: any) {
    return { success: false, error: err?.message, watches: [], total: 0 }
  }
}

export async function updateRouteWatchStatus(watchId: string, status: 'active' | 'paused' | 'expired') {
  const { databases } = createAdminClient()

  try {
    await databases.updateDocument(DB_ID, TABLES.ROUTE_WATCHES, watchId, { status })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

export async function deleteRouteWatch(watchId: string) {
  const { databases } = createAdminClient()

  try {
    await databases.deleteDocument(DB_ID, TABLES.ROUTE_WATCHES, watchId)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}

// ── Payment Events ─────────────────────────────────────────────────────────

export async function listPaymentEvents(userId: string, limit = 25) {
  const { databases } = createAdminClient()

  try {
    const rows = await databases.listDocuments(DB_ID, TABLES.PAYMENT_EVENTS, [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
    ])
    return { success: true, events: rows.documents, total: rows.total }
  } catch (err: any) {
    return { success: false, error: err?.message, events: [], total: 0 }
  }
}

// ── Egress Config ──────────────────────────────────────────────────────────

export async function getEgressConfig(userId: string) {
  const { databases } = createAdminClient()

  try {
    const rows = await databases.listDocuments(DB_ID, TABLES.EGRESS_CONFIGS, [
      Query.equal('userId', userId),
      Query.limit(1),
    ])
    if (rows.documents.length > 0) {
      return { success: true, config: rows.documents[0] }
    }
    return { success: true, config: null }
  } catch (err: any) {
    return { success: false, error: err?.message, config: null }
  }
}

export async function saveEgressConfig(data: {
  userId: string
  webhookUrl?: string
  webhookSecret?: string
  nostrRelays?: string
  signWithNsec?: boolean
}) {
  const { databases } = createAdminClient()

  try {
    const existing = await databases.listDocuments(DB_ID, TABLES.EGRESS_CONFIGS, [
      Query.equal('userId', data.userId),
      Query.limit(1),
    ])

    if (existing.documents.length > 0) {
      await databases.updateDocument(DB_ID, TABLES.EGRESS_CONFIGS, existing.documents[0].$id, {
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        nostrRelays: data.nostrRelays,
        signWithNsec: data.signWithNsec ?? false,
        isActive: true,
      })
    } else {
      await databases.createDocument(DB_ID, TABLES.EGRESS_CONFIGS, ID.unique(), {
        configId: ID.unique(),
        userId: data.userId,
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
        nostrRelays: data.nostrRelays,
        signWithNsec: data.signWithNsec ?? false,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message }
  }
}
