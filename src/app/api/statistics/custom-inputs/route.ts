import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get custom inputs
    const customInputs = await prisma.customInput.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response
    const inputs = customInputs.map((input) => ({
      id: input.id,
      text: input.text,
      timestamp: input.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return NextResponse.json({ inputs });

  } catch (error) {
    console.error('Error fetching custom inputs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom inputs' },
      { status: 500 }
    );
  }
}
