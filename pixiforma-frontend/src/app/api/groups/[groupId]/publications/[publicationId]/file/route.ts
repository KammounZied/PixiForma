import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function DELETE(req: Request, { params }: { params: Promise<{ groupId: string; publicationId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { groupId, publicationId } = await params;

        const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.delete(`/groups/${groupId}/publications/${publicationId}/file`, {}, headers);
        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in DELETE /api/groups/[groupId]/publications/[publicationId]/file:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message || error }, { status: 500 });
    }
}
