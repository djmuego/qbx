export type AccountSectionId =
  | 'overview'
  | 'billing'
  | 'integrations'
  | 'workspace'
  | 'team'
  | 'data'
  | 'danger';

export const ACCOUNT_SECTIONS: AccountSectionId[] = [
  'overview',
  'billing',
  'integrations',
  'workspace',
  'team',
  'data',
  'danger',
];

/** Legacy deep links (?section=profile|security) map to overview. */
export const ACCOUNT_SECTION_ALIASES: Record<string, AccountSectionId> = {
  profile: 'overview',
  security: 'overview',
};
