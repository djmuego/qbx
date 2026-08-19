import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserDataExport {
  exportedAt: string;
  profile: Record<string, unknown> | null;
  memberships: Array<Record<string, unknown>>;
  ownedWorkspaces: Array<Record<string, unknown>>;
}

export async function exportMyData(client: SupabaseClient): Promise<UserDataExport> {
  const { data, error } = await client.rpc('export_my_data');
  if (error) throw new Error(error.message);
  return data as UserDataExport;
}

export async function deleteMyAccount(client: SupabaseClient, confirmEmail: string): Promise<void> {
  const { error } = await client.rpc('delete_my_account', { confirm_email: confirmEmail.trim().toLowerCase() });
  if (error) throw new Error(error.message);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
