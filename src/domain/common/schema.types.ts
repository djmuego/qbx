export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export interface PersistedEnvelope<T> {
  schemaVersion: SchemaVersion;
  data: T;
}
