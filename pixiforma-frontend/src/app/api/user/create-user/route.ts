// src/app/api/user/create-user/route.ts
import { NextResponse } from 'next/server';
import { CommonFunction, Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function POST(req: Request) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const body = await req.json();
        const authorization = req.headers.get('authorization') ?? undefined;

        // Utilise /register — le seul endpoint de création de compte Laravel
        const apiRes = await api.post(
            `/register`,
            body,
            await CommonFunction.createHeaders({ 
                customToken: authorization,
                withToken: !!authorization 
            })
        );

        return NextResponse.json(apiRes.data, { status: apiRes.status });
    } catch (error: any) {
        console.error('Error in create-user route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message || error },
            { status: 500 }
        );
    }
}