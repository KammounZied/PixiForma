import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicationId: string; fileId: string }> }) {
    try {
        const { publicationId, fileId } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        let accessToken: string | undefined;

        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            accessToken = authHeader.slice(7);
        }

        if (!accessToken) {
            const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
            accessToken = token?.accessToken as string | undefined;
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const downloadParam = searchParams.get('download') === '1' ? '?download=1' : '';

        const response = await fetch(`${apiUrl}/publications/${publicationId}/files/${fileId}${downloadParam}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': '*/*',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Fichier non trouvé' }, { status: response.status });
        }

        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const disposition = response.headers.get('content-disposition') || '';

        const headers: Record<string, string> = {
            'Content-Type': contentType,
        };
        if (disposition) {
            headers['Content-Disposition'] = disposition;
        }

        return new Response(blob, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Error in GET /api/publications/[publicationId]/files/[fileId]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ publicationId: string; fileId: string }> }) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.accessToken) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { fileId } = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${apiUrl}/publications/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Error in DELETE /api/publications/[publicationId]/files/[fileId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}
