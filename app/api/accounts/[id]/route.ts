import { NextRequest, NextResponse } from 'next/server';
import { accounts } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { name, username, user_id } = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    if (!name || !username || !user_id) {
      return NextResponse.json(
        { error: 'Name, username, and user_id are required' },
        { status: 400 }
      );
    }

    const account = await accounts.update(id, name, username, user_id);
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    const success = await accounts.delete(id);
    if (!success) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', message: error.message },
      { status: 500 }
    );
  }
}
