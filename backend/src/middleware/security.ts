import { Request, Response, NextFunction } from 'express';
export const helmetConfig = {
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true }
};
export const sqlInjectionDetector = (req: Request, res: Response, next: NextFunction) => {
  const patterns = [/(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i, /1=1/, /'\s*OR\s*'/i];
  const check = (obj: any) => {
    if (!obj) return false;
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && patterns.some(p => p.test(v))) return true;
      if (typeof v === 'object') return check(v);
    }
    return false;
  };
  if (check(req.body) || check(req.query)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  next();
};
export const xssDetector = (req: Request, res: Response, next: NextFunction) => {
  const patterns = [/<script/i, /javascript:/i, /on\w+=/i];
  const check = (obj: any) => {
    if (!obj) return false;
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && patterns.some(p => p.test(v))) return true;
      if (typeof v === 'object') return check(v);
    }
    return false;
  };
  if (check(req.body) || check(req.query)) {
    return res.status(400).json({ error: 'Invalid content' });
  }
  next();
};
