import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ quizId: string; index: string }> }) {
    try {
        const { quizId, index } = await params;
        const authorization = req.headers.get('authorization') ?? undefined;
        const apiUrl = process.env.API_URL || 'http://localhost:8000/api';

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (authorization) headers['Authorization'] = authorization;

        const backendRes = await fetch(`${apiUrl}/quizzes/${quizId}/toggle-question/${index}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({}),
        });

        const data = await backendRes.json().catch(() => null);
        return NextResponse.json(data ?? { message: 'Réponse invalide du serveur' }, { status: backendRes.status });
    } catch (error: any) {
        console.error('Error in PATCH toggle-question:', error?.message || error);
        return NextResponse.json({ message: 'Erreur de connexion au serveur' }, { status: 502 });
    }
}
