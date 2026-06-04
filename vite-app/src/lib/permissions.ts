import type { UserRole } from "@/types/auth-type"

const STAFF_ROLES: UserRole[] = ["ADMIN", "COUNSELOR"]

const hasAnyRole = (
  role: UserRole | null | undefined,
  allowedRoles: readonly UserRole[]
) => {
  if (!role) {
    return false
  }

  return allowedRoles.includes(role)
}

const isAdmin = (role: UserRole | null | undefined) => role === "ADMIN"

const canReadManagedContent = (role: UserRole | null | undefined) =>
  hasAnyRole(role, STAFF_ROLES)

const canManageManagedContent = (role: UserRole | null | undefined) =>
  isAdmin(role)

const canAccessAdminOnlyTools = (role: UserRole | null | undefined) =>
  isAdmin(role)

export {
  canAccessAdminOnlyTools,
  canManageManagedContent,
  canReadManagedContent,
  hasAnyRole,
  isAdmin,
}
