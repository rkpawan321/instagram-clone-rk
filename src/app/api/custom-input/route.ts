import { NextRequest, NextResponse } from 'next/server';
import { promptGenerator } from '@/lib/prompt-generator';

export async function POST(request: NextRequest) {
  try {
    const { userId = 'demo-user-1', text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    // Add custom input
    const customInput = await promptGenerator.addCustomInput(userId, text.trim());

    return NextResponse.json({
      success: true,
      customInput
    });

  } catch (error) {
    console.error('Error adding custom input:', error);
    return NextResponse.json(
      { error: 'Failed to add custom input' },
      { status: 500 }
    );
  }
}
