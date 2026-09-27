import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicationId: string }> }) {
    try {
        const { publicationId } = await params;
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

        const response = await fetch(`${apiUrl}/publications/${publicationId}/summary/pdf`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': '*/*',
            },
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('Backend PDF error:', response.status, text);
            return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: response.status });
        }

        const blob = await response.blob();
        const contentType = response.headers.get('content-type') || 'application/pdf';
        const disposition = response.headers.get('content-disposition') || '';

        const headers: Record<string, string> = { 'Content-Type': contentType };
        if (disposition) {
            headers['Content-Disposition'] = disposition;
        }

        return new Response(blob, { status: 200, headers });
    } catch (error: any) {
        console.error('Error in GET summary/pdf:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
