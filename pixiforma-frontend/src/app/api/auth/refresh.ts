import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const response = await fetch(`${process.env.API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        message: data.message || 'Failed to refresh token' 
      });
    }

    const refreshedTokens = {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.data.expires_in,
    };

    return res.status(200).json(refreshedTokens);
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}