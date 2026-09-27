import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicationId: string }> }) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.accessToken) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { publicationId } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const { searchParams } = new URL(req.url);
        const query = new URLSearchParams();
        const page = searchParams.get('page');
        const perPage = searchParams.get('per_page');
        if (page) query.set('page', page);
        if (perPage) query.set('per_page', perPage);
        const qs = query.toString();

        const response = await fetch(`${apiUrl}/publications/${publicationId}/comments${qs ? `?${qs}` : ''}`, {
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'Accept': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Error in GET /api/publications/[publicationId]/comments:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ publicationId: string }> }) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.accessToken) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { publicationId } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const body = await req.json();

        const response = await fetch(`${apiUrl}/publications/${publicationId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Error in POST /api/publications/[publicationId]/comments:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}
