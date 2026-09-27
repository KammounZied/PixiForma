import { Routes } from '@/lib/routes';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt' as const,
        maxAge: 30 * 24 * 60 * 60,
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                rememberMe: { label: "Remember Me", type: "hidden" },
            },
            async authorize(credentials) {
                try {
                    const body: Record<string, any> = {
                        email: credentials?.email,
                        password: credentials?.password,
                    };
                    if (credentials?.rememberMe !== undefined) {
                        body.rememberMe = credentials.rememberMe === 'true';
                    }

                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(body),
                    });

                    const data = await res.json();

                    if (res.ok && data) {
                        return {
                            ...data,
                            expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 900),
                            rememberMe: body.rememberMe || false,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error('Login error:', error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: Routes.Login
    },
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
                const actualUser = user.user || user;
                
                // Slim down the user object to avoid oversized JWT cookies (HTTP 431)
                const slimUser = actualUser ? {
                    id: actualUser.id,
                    name: actualUser.name,
                    email: actualUser.email,
                    avatar: actualUser.avatar,
                    force_password_change: actualUser.force_password_change,
                    roles: (actualUser.roles || []).map((r: any) => ({
                        name: r.name,
                        permissions: (r.permissions || []).map((p: any) => ({ name: p.name })),
                    })),
                } : null;

                return {
                    accessToken: user.access_token || user.accessToken,
                    refreshToken: user.refresh_token || user.refreshToken,
                    expiresAt: user.expires_at || user.expiresAt,
                    rememberMe: user.rememberMe || false,
                    user: slimUser,
                    force_password_change: actualUser?.force_password_change || false,
                };
            }

            if (trigger === 'update' && session) {
                token.force_password_change = session.force_password_change ?? token.force_password_change;
                if (token.user) {
                    token.user.force_password_change = token.force_password_change;
                }
                return token;
            }

            // No refresh token => remember me personal access token (long-lived, no refresh)
            if (!token.refreshToken) {
                return token;
            }

            // If a previous refresh already failed, don't retry endlessly
            if (token.refreshFailed) {
                return token;
            }

            // Proactive refresh when less than 5 minutes remain
            if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 300) {
                return token;
            }

            return refreshAccessToken(token);
        },
        async session({ session, token }: any) {
            if (token) {
                // Ensure we don't end up with session.user.user
                session.user = token.user?.user ? token.user.user : token.user;
                if (session.user) {
                    session.user.force_password_change = token.force_password_change ?? token.user?.force_password_change ?? false;
                }
                session.accessToken = token.accessToken;
                session.error = token.error;
            }
            return session;
        },
    },
};

async function refreshAccessToken(token: any) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: token.refreshToken,
            }),
        });

        const data = await res.json();

        if (!res.ok) throw data;
        
        const actualUser = data.user || {};

        const slimUser = actualUser ? {
            id: actualUser.id,
            name: actualUser.name,
            email: actualUser.email,
            avatar: actualUser.avatar,
            force_password_change: actualUser.force_password_change,
            roles: (actualUser.roles || []).map((r: any) => ({
                name: r.name,
                permissions: (r.permissions || []).map((p: any) => ({ name: p.name })),
            })),
        } : {};

        // Clear any stale error/refreshFailed flags on success
        const cleaned = { ...token };
        delete cleaned.error;
        delete cleaned.refreshFailed;

        return {
            ...cleaned,
            accessToken: data.access_token || data.accessToken,
            refreshToken: data.refresh_token || data.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || data.expiresIn || 900),
            user: { ...token.user, ...slimUser },
            force_password_change: actualUser?.force_password_change ?? token.force_password_change,
        };
    } catch (error) {
        console.error('Refresh token error:', error);
        // Set a flag so we don't retry indefinitely — the session will die on token expiry
        return {
            ...token,
            error: "RefreshAccessTokenError",
            refreshFailed: true,
        };
    }
}
