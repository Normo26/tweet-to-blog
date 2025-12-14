import { NextRequest, NextResponse } from 'next/server';
import { accounts } from '@/lib/db';

export async function GET() {
  try {
    const allAccounts = await accounts.getAll();
    return NextResponse.json(allAccounts);
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, username, user_id } = await request.json();
    
    if (!name || !username || !user_id) {
      return NextResponse.json(
        { error: 'Name, username, and user_id are required' },
        { status: 400 }
      );
    }
    
    const account = await accounts.add(name, username, user_id);
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('Error adding account:', error);
    return NextResponse.json(
      { error: 'Failed to add account', message: error.message },
      { status: 500 }
    );
  }
}
