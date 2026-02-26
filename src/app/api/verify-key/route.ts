import { NextRequest, NextResponse } from 'next/server';
import { ProviderName } from '@/types/analysis';

interface VerifyKeyRequest {
  provider: ProviderName;
  apiKey: string;
}

interface VerifyKeyResponse {
  valid: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyKeyRequest = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json<VerifyKeyResponse>(
        { valid: false, error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    let valid = false;
    let error: string | undefined;

    switch (provider) {
      case 'openai': {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          valid = response.ok;
          if (!valid) {
            const data = await response.json().catch(() => ({}));
            error = data.error?.message || 'Invalid API key';
          }
        } catch (err) {
          error = 'Connection failed';
        }
        break;
      }

      case 'anthropic': {
        try {
          // Anthropic doesn't have a simple models endpoint, so we'll try a minimal request
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }]
            })
          });
          // Even a rate limit or valid response means the key is valid
          valid = response.ok || response.status === 429;
          if (!valid) {
            const data = await response.json().catch(() => ({}));
            error = data.error?.message || 'Invalid API key';
          }
        } catch (err) {
          error = 'Connection failed';
        }
        break;
      }

      case 'gemini': {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          valid = response.ok;
          if (!valid) {
            const data = await response.json().catch(() => ({}));
            error = data.error?.message || 'Invalid API key';
          }
        } catch (err) {
          error = 'Connection failed';
        }
        break;
      }

      case 'perplexity': {
        try {
          // Perplexity doesn't have a models endpoint, try a minimal request
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }]
            })
          });
          valid = response.ok || response.status === 429;
          if (!valid) {
            const data = await response.json().catch(() => ({}));
            error = data.error?.message || 'Invalid API key';
          }
        } catch (err) {
          error = 'Connection failed';
        }
        break;
      }
    }

    return NextResponse.json<VerifyKeyResponse>({ valid, error });
  } catch (error) {
    console.error('Key verification error:', error);
    return NextResponse.json<VerifyKeyResponse>(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
