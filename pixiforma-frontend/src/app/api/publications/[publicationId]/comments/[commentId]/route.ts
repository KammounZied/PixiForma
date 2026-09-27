import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ publicationId: string; commentId: string }> }) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.accessToken) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { publicationId, commentId } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const body = await req.json();

        const response = await fetch(`${apiUrl}/publications/${publicationId}/comments/${commentId}`, {
            method: 'PUT',
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
        console.error('Error in PUT /api/publications/[publicationId]/comments/[commentId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ publicationId: string; commentId: string }> }) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.accessToken) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { publicationId, commentId } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${apiUrl}/publications/${publicationId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'Accept': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Error in DELETE /api/publications/[publicationId]/comments/[commentId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}
