import { NextRequest, NextResponse } from 'next/server';
import { settings } from '@/lib/db';

export async function GET() {
  try {
    const allSettings = {
      openaiApiKey: await settings.get('openaiApiKey'),
      wordpressEnglishUrl: await settings.get('wordpressEnglishUrl'),
      wordpressEnglishUsername: await settings.get('wordpressEnglishUsername'),
      wordpressEnglishPassword: await settings.get('wordpressEnglishPassword'),
      wordpressFrenchUrl: await settings.get('wordpressFrenchUrl'),
      wordpressFrenchUsername: await settings.get('wordpressFrenchUsername'),
      wordpressFrenchPassword: await settings.get('wordpressFrenchPassword'),
      autoMode: await settings.getBoolean('autoMode', false),
      autoModeMinChars: parseInt(await settings.get('autoModeMinChars') || '100') || 100,
      autoModeRequireMedia: await settings.getBoolean('autoModeRequireMedia', true),
    };
    return NextResponse.json(allSettings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Update each setting that's provided
    if (body.openaiApiKey !== undefined) {
      await settings.set('openaiApiKey', body.openaiApiKey);
    }
    if (body.wordpressEnglishUrl !== undefined) {
      await settings.set('wordpressEnglishUrl', body.wordpressEnglishUrl);
    }
    if (body.wordpressEnglishUsername !== undefined) {
      await settings.set('wordpressEnglishUsername', body.wordpressEnglishUsername);
    }
    if (body.wordpressEnglishPassword !== undefined) {
      await settings.set('wordpressEnglishPassword', body.wordpressEnglishPassword);
    }
    if (body.wordpressFrenchUrl !== undefined) {
      await settings.set('wordpressFrenchUrl', body.wordpressFrenchUrl);
    }
    if (body.wordpressFrenchUsername !== undefined) {
      await settings.set('wordpressFrenchUsername', body.wordpressFrenchUsername);
    }
    if (body.wordpressFrenchPassword !== undefined) {
      await settings.set('wordpressFrenchPassword', body.wordpressFrenchPassword);
    }
    if (body.autoMode !== undefined) {
      await settings.setBoolean('autoMode', body.autoMode);
    }
    if (body.autoModeMinChars !== undefined) {
      await settings.set('autoModeMinChars', body.autoModeMinChars.toString());
    }
    if (body.autoModeRequireMedia !== undefined) {
      await settings.setBoolean('autoModeRequireMedia', body.autoModeRequireMedia);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', message: error.message },
      { status: 500 }
    );
  }
}
