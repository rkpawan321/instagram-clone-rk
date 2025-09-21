import { NextRequest, NextResponse } from 'next/server';
import { promptGenerator } from '@/lib/prompt-generator';

export async function POST(request: NextRequest) {
  try {
    const { userId = 'demo-user-1' } = await request.json();

    // Generate prompt from user interactions
    const promptData = await promptGenerator.generatePrompt(userId);

    return NextResponse.json({
      success: true,
      data: promptData
    });

  } catch (error) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user-1';

    // Get user's interaction history
    const history = await promptGenerator.getUserHistory(userId);

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Error fetching user history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user history' },
      { status: 500 }
    );
  }
}
