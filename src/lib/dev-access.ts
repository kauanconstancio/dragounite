// Allowlist of emails permitted to access the developer/owner area.
// Combined with the `super_admin` role check for defense in depth.
export const DEV_OWNER_EMAILS = [
  "kauanconstancio13@gmail.com",
];

export function isDevOwner(email?: string | null, isSuperAdmin?: boolean) {
  if (!email) return false;
  if (!isSuperAdmin) return false;
  return DEV_OWNER_EMAILS.includes(email.toLowerCase());
}
