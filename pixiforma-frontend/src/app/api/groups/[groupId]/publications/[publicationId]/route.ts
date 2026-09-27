import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function GET(req: Request, { params }: { params: Promise<{ groupId: string; publicationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId, publicationId } = await params;

        const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.get(`/groups/${groupId}/publications/${publicationId}`, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in GET /api/groups/[groupId]/publications/[publicationId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ groupId: string; publicationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId, publicationId } = await params;

        const contentType = req.headers.get('content-type') || '';
        let body: any;
        const headers: any = {};
        if (authorization) headers['Authorization'] = authorization;

        if (contentType.includes('multipart/form-data')) {
            body = await req.formData();
        } else {
            body = await req.json();
            headers['Content-Type'] = 'application/json';
            headers['Accept'] = 'application/json';
        }

        const apiRes = await api.put(`/groups/${groupId}/publications/${publicationId}`, body, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in PUT /api/groups/[groupId]/publications/[publicationId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string; publicationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId, publicationId } = await params;

        const contentType = req.headers.get('content-type') || '';
        let body: any;
        const headers: any = {};
        if (authorization) headers['Authorization'] = authorization;

        if (contentType.includes('multipart/form-data')) {
            body = await req.formData();
        } else {
            body = await req.json();
            headers['Content-Type'] = 'application/json';
            headers['Accept'] = 'application/json';
        }

        const apiRes = await api.post(`/groups/${groupId}/publications/${publicationId}`, body, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in POST /api/groups/[groupId]/publications/[publicationId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string; publicationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId, publicationId } = await params;

        const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.delete(`/groups/${groupId}/publications/${publicationId}`, {}, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in DELETE /api/groups/[groupId]/publications/[publicationId]:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}
