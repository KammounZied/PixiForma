import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function GET(req: Request, { params }: { params: Promise<{ formationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { formationId } = await params;
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;
        const apiRes = await api.get(`/formations/${formationId}/my-progress`, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in GET /api/formations/[formationId]/my-progress:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ formationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { formationId } = await params;
        const body = await req.json().catch(() => ({}));
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;
        const apiRes = await api.post(`/formations/${formationId}/my-progress`, body, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in POST /api/formations/[formationId]/my-progress:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
