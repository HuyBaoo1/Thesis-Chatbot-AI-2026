type StaffLoginRequest = {
  email: string
  password: string
}

type UserRole = "ADMIN" | "COUNSELOR"

type AuthUser = {
  sub: string
  name: string
  email: string
  role: UserRole
}

type StaffLoginResponse = {
  access_token: string
  user: AuthUser
}

export type { StaffLoginRequest, AuthUser, StaffLoginResponse, UserRole }
