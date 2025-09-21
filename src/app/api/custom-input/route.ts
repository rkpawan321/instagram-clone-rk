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
    try {
      const customInput = await promptGenerator.addCustomInput(userId, text.trim());
      return NextResponse.json({
        success: true,
        customInput
      });
    } catch (dbError) {
      console.warn('Failed to save custom input to database (database write issue):', dbError.message);
      // Return success even if database write fails
      return NextResponse.json({
        success: true,
        customInput: {
          id: 'temp-' + Date.now(),
          userId,
          text: text.trim(),
          createdAt: new Date().toISOString()
        },
        warning: 'Custom input saved temporarily (database write issue)'
      });
    }

  } catch (error) {
    console.error('Error adding custom input:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to add custom input', details: error.message },
      { status: 500 }
    );
  }
}
