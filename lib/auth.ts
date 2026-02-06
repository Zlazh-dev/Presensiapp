import { SignJWT, jwtVerify } from 'jose';

export interface AuthTokenPayload {
    userId: number;
    role: 'ADMIN' | 'TEACHER' | 'PRINCIPAL';
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
    try {
        const token = await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1h') // Token expires in 1 hour
            .sign(secret);

        return token;
    } catch (error) {
        console.error('Error signing auth token:', error);
        throw error;
    }
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);

        return {
            userId: payload.userId as number,
            role: payload.role as 'ADMIN' | 'TEACHER' | 'PRINCIPAL',
        };
    } catch (error) {
        // Token is invalid or expired
        return null;
    }
}
