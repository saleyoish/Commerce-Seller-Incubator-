import { NextRequest } from 'next/server';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: Date }>();

  async check(
    identifier: string,
    action: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const key = `${action}:${identifier}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Get existing request record
    let record = this.requests.get(key);
    
    // Clean up expired records
    if (record && record.resetTime < now) {
      this.requests.delete(key);
      record = undefined;
    }

    // Create new record if doesn't exist
    if (!record) {
      record = {
        count: 0,
        resetTime: new Date(now.getTime() + windowMs)
      };
      this.requests.set(key, record);
    }

    // Check if under limit
    if (record.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    // Increment count
    record.count++;
    
    return {
      allowed: true,
      remaining: limit - record.count,
      resetTime: record.resetTime
    };
  }

  getClientIP(request: NextRequest): string {
    // Try various headers for client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (clientIP) {
      return clientIP;
    }
    
    // Fallback to a default value
    return 'unknown';
  }
}

export const rateLimiter = new RateLimiter();
