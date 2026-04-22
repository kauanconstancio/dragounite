import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";

export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole, loading } = useAuth();
  if (loading) return null;
  return roles.some(hasRole) ? <>{children}</> : <>{fallback}</>;
}
