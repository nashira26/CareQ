/**
 * Which MongoDB database holds what.
 *
 *   MONGODB_DB          app data: accounts, children, centres, applications, conversations,
 *                       notifications, support requests, sessions (and a centre's own uploaded documents)
 *   MONGODB_POLICY_DB   the published policy index: policyChunks + its vector index, and the
 *                       query-embedding cache. Defaults to MONGODB_DB.
 *
 * Locally: MONGODB_DB=careq_local, MONGODB_POLICY_DB=careq_dev, so local work never changes the live
 * demo's data but searches the same handbooks. The server only reads a policy database that isn't its
 * own (uploads and new query embeddings stay in MONGODB_DB / memory). On Render both are careq_dev.
 */
import { POLICY_CHUNKS, QUERY_EMBEDDINGS } from './policyIndexConfig';

export const appDbName = (): string | undefined => process.env.MONGODB_DB?.trim() || undefined;
export const policyDbName = (): string | undefined => process.env.MONGODB_POLICY_DB?.trim() || appDbName();

/** Collections in MONGODB_POLICY_DB that scripts must never write to. */
export const POLICY_COLLECTIONS: readonly string[] = [POLICY_CHUNKS, QUERY_EMBEDDINGS];

export const isProtectedPolicyCollection = (dbName: string | undefined, collection: string, policyDb = policyDbName()) =>
  Boolean(dbName) && dbName === policyDb && POLICY_COLLECTIONS.includes(collection);

/** Throws if a script is about to write to a policy collection in MONGODB_POLICY_DB. */
export function assertNotPolicyWrite(dbName: string | undefined, collection: string, policyDb = policyDbName()) {
  if (isProtectedPolicyCollection(dbName, collection, policyDb)) {
    throw new Error(`Refusing to write to ${dbName}.${collection}: it is the policy index (MONGODB_POLICY_DB).`);
  }
}
