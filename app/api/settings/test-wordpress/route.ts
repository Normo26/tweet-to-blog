import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, username, password } = await request.json();

    if (!url || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'URL, username, and password are required' },
        { status: 400 }
      );
    }

    // Test WordPress connection by fetching user info
    const wpApiUrl = `${url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(wpApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        user: {
          id: userData.id,
          name: userData.name,
          username: userData.slug,
        },
      });
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || `WordPress API error: ${response.status}`,
        },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error('Error testing WordPress connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to connect to WordPress. Please check the URL and credentials.',
      },
      { status: 500 }
    );
  }
}
