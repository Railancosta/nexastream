import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'nexastream-api', version: '2.0.0', timestamp: Date.now(), mode: 'vercel' });
}
