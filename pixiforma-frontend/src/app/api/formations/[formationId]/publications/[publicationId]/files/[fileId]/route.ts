import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ formationId: string; publicationId: string; fileId: string }> }) {
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

        const downloadParam = req.nextUrl.searchParams.get('download') === '1' ? '?download=1' : '';

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
        console.error('Error in GET /api/formations/[formationId]/publications/[publicationId]/files/[fileId]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
