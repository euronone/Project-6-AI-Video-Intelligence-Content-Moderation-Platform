import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ data: { message: 'Registration successful. Please sign in.' } }, { status: 201 });
}
