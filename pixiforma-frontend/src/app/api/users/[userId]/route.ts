import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function PUT(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { userId } = await params;

        const body = await req.json();

        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.put(
            `/users/${userId}`,
            body,
            headers
        );

        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in PUT /api/users/[userId] proxy route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;
        const { userId } = await params;

        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (authorization) headers['Authorization'] = authorization;

        const apiRes = await api.delete(
            `/users/${userId}`,
            {},
            headers
        );

        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in DELETE /api/users/[userId] proxy route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}
