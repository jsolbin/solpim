import type { UserRole } from './auth'

export function hasRequiredRole(
  role: UserRole | undefined,
  allowedRoles: readonly UserRole[]
): role is UserRole {
  return role !== undefined && allowedRoles.includes(role)
}
