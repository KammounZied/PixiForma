import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function PUT(req: Request, { params }: { params: Promise<{ formationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { formationId } = await params;
        const body = await req.json();
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;
        const apiRes = await api.put(`/formations/${formationId}/publications/reorder`, body, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in PUT /api/formations/[formationId]/publications/reorder:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
