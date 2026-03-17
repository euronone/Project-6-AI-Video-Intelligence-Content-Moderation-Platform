import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
      { status: 400 }
    );
  }

  // Mock credentials
  const MOCK_USERS = [
    { email: 'admin@vidshield.ai', password: 'password123', role: 'admin', name: 'Admin User' },
    { email: 'operator@vidshield.ai', password: 'password123', role: 'operator', name: 'Operator User' },
  ] as const;

  const user = MOCK_USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    data: {
      access_token: 'mock-access-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'user-' + user.role,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: 'org-vidshield-demo',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-03-17T00:00:00Z',
      },
    },
  });
}
