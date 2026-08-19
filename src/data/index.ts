import { dataBackendMode } from '../infrastructure/supabase/config';
import { createLocalDemoDataLayer } from './adapters/local-demo.repository';
import type { LocalDemoDataLayerInstance } from './adapters/local-demo.repository';
import type { AuthSessionContext } from '../domain/auth/auth.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseDataLayer } from './adapters/supabase/create-supabase-data-layer';

export interface DataLayerContext {
  mode: 'local' | 'supabase';
  session?: AuthSessionContext;
  supabase?: SupabaseClient;
}

export async function createDataLayer(ctx?: DataLayerContext): Promise<LocalDemoDataLayerInstance> {
  const mode = ctx?.mode ?? dataBackendMode();
  if (mode === 'supabase' && ctx?.session && ctx.supabase) {
    return createSupabaseDataLayer(ctx.supabase, ctx.session);
  }
  return createLocalDemoDataLayer();
}

export { createLocalDemoDataLayer } from './adapters/local-demo.repository';
export type { QbxDataLayer } from './contracts/repositories';
