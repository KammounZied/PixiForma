import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function PUT(req: Request, { params }: { params: Promise<{ roleId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { roleId } = await params;
        
        const body = await req.json();

        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.put(
            `/roles/${roleId}/permissions/toggle`,
            body,
            headers
        );

        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in PUT /api/roles/[roleId]/permissions/toggle proxy route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}
