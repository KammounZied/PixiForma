import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: Request, { params }: { params: Promise<{ formationId: string; publicationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { formationId, publicationId } = await params;
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;
        const apiRes = await api.get(`/formations/${formationId}/publications/${publicationId}/quiz/review`, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in GET quiz-review:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
