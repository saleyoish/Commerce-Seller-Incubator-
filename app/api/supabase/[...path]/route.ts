import { NextRequest, NextResponse } from 'next/server';
import { getCookieConfig } from '@/lib/cookie-config';
import { extractToken } from '@/lib/jwt';

function getRequiredEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabasePublishableKey = getRequiredEnvVar(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const cookieConfig = getCookieConfig();

function parseSetCookieHeader(setCookie: string) {
  const parts = setCookie.split(/;\s*/);
  const [nameValue, ...directives] = parts;
  const [name, ...valueParts] = nameValue.split('=');
  const value = valueParts.join('=');

  const options: Record<string, any> = {};

  directives.forEach((directive) => {
    const [key, ...rest] = directive.split('=');
    const lowerKey = key.toLowerCase();
    const rawValue = rest.join('=');

    if (lowerKey === 'expires') {
      options.expires = new Date(rawValue);
    } else if (lowerKey === 'max-age') {
      options.maxAge = Number(rawValue);
    } else if (lowerKey === 'samesite') {
      options.sameSite = rawValue.toLowerCase();
    } else if (lowerKey === 'path') {
      options.path = rawValue;
    } else if (lowerKey === 'domain') {
      options.domain = rawValue;
    } else if (lowerKey === 'secure') {
      options.secure = true;
    } else if (lowerKey === 'httponly') {
      options.httpOnly = true;
    }
  });

  return { name, value, options };
}

function buildSupabaseUrl(pathSegments: string[] | undefined, searchParams: string) {
  const path = pathSegments?.join('/') ?? '';
  const url = new URL(`${supabaseUrl}/${path}`);
  url.search = searchParams;
  return url.toString();
}

async function proxyRequest(req: NextRequest, params: { path?: string[] }) {
  const url = buildSupabaseUrl(params.path, new URL(req.url).search);
  const headers = new Headers(req.headers);
  headers.set('apikey', supabasePublishableKey);

  // Add JWT token for custom auth if available
  const token = extractToken(req.headers, req.cookies);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  headers.delete('host');
  headers.delete('content-length');

  const response = await fetch(url, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
    redirect: 'manual',
  });

  const proxied = new NextResponse(response.body, {
    status: response.status,
  });

  response.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();

    if (normalizedKey === 'set-cookie') {
      const { name, value: cookieValue, options } = parseSetCookieHeader(value);
      proxied.cookies.set(name, cookieValue, {
        ...cookieConfig,
        ...options,
        domain: undefined,
      });
      return;
    }

    if (normalizedKey === 'content-length' || normalizedKey === 'transfer-encoding') {
      return;
    }

    proxied.headers.set(key, value);
  });

  return proxied;
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}

export async function OPTIONS(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return proxyRequest(req, params);
}
