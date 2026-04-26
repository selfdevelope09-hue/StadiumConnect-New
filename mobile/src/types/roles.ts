export type AppRole =
  | 'user'
  | 'admin'
  | 'owner'
  | 'agent'
  | 'developer'
  | 'vendor'
  | 'superAdmin';

const VALID: AppRole[] = [
  'user',
  'admin',
  'owner',
  'agent',
  'developer',
  'vendor',
  'superAdmin',
];

export function parseRole(v: unknown): AppRole {
  if (typeof v === 'string' && VALID.includes(v as AppRole)) {
    return v as AppRole;
  }
  return 'user';
}
