import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function GET(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId } = await params;

        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.get(`/groups/${groupId}/publications`, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in GET /api/groups/[groupId]/publications:', error);
        return NextResponse.json({ error: 'Internal server error', details: error?.message || String(error) }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId } = await params;

        const contentType = req.headers.get('content-type') || '';
        const headers: Record<string, string> = {};
        if (authorization) headers['Authorization'] = authorization;

        let body: any;
        if (contentType.includes('multipart/form-data')) {
            body = await req.formData();
        } else {
            body = await req.json();
            headers['Content-Type'] = 'application/json';
            headers['Accept'] = 'application/json';
        }

        const apiRes = await api.post(`/groups/${groupId}/publications`, body, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in POST /api/groups/[groupId]/publications:', error);
        return NextResponse.json({ error: 'Internal server error', details: error?.message || String(error) }, { status: 500 });
    }
}
