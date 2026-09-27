import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function GET(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId } = await params;

        const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.get(`/groups/${groupId}/members`, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in GET /api/groups/[groupId]/members proxy route:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}
