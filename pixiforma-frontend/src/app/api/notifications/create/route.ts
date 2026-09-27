import { NextResponse } from 'next/server';
import { Config } from '@/common';
import { Api } from '@/common/StandardApi/api';

export async function POST(req: Request) {
    try {
        const config = Config.getInstance();
        const api = new Api(config.API_URL);
        const authorization = req.headers.get('authorization') ?? undefined;

        const body = await req.json();
        const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (authorization) headers['Authorization'] = authorization;

        let apiRes = await api.post('/notifications', body, headers);

        if (!apiRes || apiRes.status >= 400) {
            const userIds = body.user_ids || [];
            if (userIds.length > 0) {
                for (const userId of userIds) {
                    const singlePayload = { ...body, user_id: userId };
                    delete singlePayload.user_ids;
                    await api.post('/notifications', singlePayload, headers).catch(() => {});
                }
            }
        }

        return NextResponse.json(apiRes?.data || { success: true }, { status: apiRes?.status || 200 });
    } catch (error: any) {
        console.error('Error in POST /api/notifications/create proxy route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
