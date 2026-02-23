import { NextResponse } from 'next/server'

type ApiErrorBody = {
  error: string
  details?: string
  retryAt?: number
}

export function apiError(
  error: string,
  status: number,
  extra?: Omit<ApiErrorBody, 'error'>
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error, ...extra }, { status })
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}
