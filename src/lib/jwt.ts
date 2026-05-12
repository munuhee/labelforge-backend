import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'labelforge-super-secret-jwt-key-change-in-production'
)

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  role: string
  tenantId?: string
  clientSlug?: string
  impersonatedBy?: string
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as TokenPayload
  } catch {
    return null
  }
}
