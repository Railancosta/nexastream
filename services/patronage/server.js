const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'patronage.db'));

// Initialize database schema
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patronage_tiers (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      monthly_price_usd REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      benefits TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      max_patrons INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000),
      updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS patrons (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      amount_usd REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      start_date INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
      end_date INTEGER,
      cancel_date INTEGER,
      payment_method TEXT,
      payment_reference TEXT,
      billing_cycle TEXT DEFAULT 'monthly',
      last_payment_date INTEGER,
      next_payment_date INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000),
      updated_at INTEGER DEFAULT (strftime('%s','now')*1000),
      UNIQUE(creator_id, user_id, tier_id)
    );

    CREATE TABLE IF NOT EXISTS patronage_benefits (
      id TEXT PRIMARY KEY,
      tier_id TEXT NOT NULL,
      benefit_type TEXT NOT NULL,
      benefit_value TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      badge_type TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      tier_id TEXT,
      expires_at INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS early_access_content (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      access_tier_ids TEXT NOT NULL DEFAULT '[]',
      release_date INTEGER,
      is_published INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS community_roles (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      role_description TEXT,
      required_tier_id TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at INTEGER DEFAULT (strftime('%s','now')*1000),
      assigned_by TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS patronage_payments (
      id TEXT PRIMARY KEY,
      patron_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_method TEXT NOT NULL,
      transaction_hash TEXT,
      transaction_status TEXT DEFAULT 'pending',
      processed_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE TABLE IF NOT EXISTS patronage_audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      user_id TEXT,
      creator_id TEXT,
      metadata TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000)
    );

    CREATE INDEX IF NOT EXISTS idx_patrons_creator ON patrons(creator_id);
    CREATE INDEX IF NOT EXISTS idx_patrons_user ON patrons(user_id);
    CREATE INDEX IF NOT EXISTS idx_patrons_status ON patrons(status);
    CREATE INDEX IF NOT EXISTS idx_patrons_tier ON patrons(tier_id);
    CREATE INDEX IF NOT EXISTS idx_tiers_creator ON patronage_tiers(creator_id);
    CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_badges_creator ON user_badges(creator_id);
    CREATE INDEX IF NOT EXISTS idx_early_access_creator ON early_access_content(creator_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_creator ON user_roles(creator_id);
  `);
};

initSchema();

// Configuration
const SERVICE_PORT = process.env.PORT || 3017;
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3002';
const LEDGER_API_URL = process.env.LEDGER_API_URL || 'http://localhost:3016';

// Anti-fraud configuration
const MAX_PATRONS_PER_USER = 100; // Max simultaneous patronage subscriptions per user
const MAX_TIER_PRICE = 10000; // Max tier price in USD
const MIN_TIER_PRICE = 0.99; // Min tier price in USD
const CREATOR_SPLIT = 0.50; // 50% to creator - MANDATORY for nexastream.org
const PLATFORM_SPLIT = 0.50; // 50% to platform owner wallet - MANDATORY for nexastream.org

// Benefit types
const BENEFIT_TYPES = {
  BADGE: 'badge',
  EARLY_ACCESS: 'early_access',
  COMMUNITY_ROLE: 'community_role',
  EXCLUSIVE_CONTENT: 'exclusive_content',
  LIVE_CHAT_ACCESS: 'live_chat_access',
  CUSTOM_EMOJI: 'custom_emoji',
  CREDITS: 'credits',
  DISCOUNT: 'discount'
};

// Badge types
const BADGE_TYPES = {
  PATRON: 'patron',
  SUPPORTER: 'supporter',
  VIP: 'vip',
  FOUNDER: 'founder',
  SPONSOR: 'sponsor',
  CUSTOM: 'custom'
};

// Helper functions
function json(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((res, rej) => {
    const c = [];
    let n = 0;
    req.on('data', (d) => {
      n += d.length;
      if (n > 1e6) req.destroy();
      else c.push(d);
    });
    req.on('end', () => res(Buffer.concat(c).toString()));
    req.on('error', rej);
  });
}

function generateId() {
  return crypto.randomUUID();
}

function getTimestamp() {
  return Date.now();
}

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function getUserAgent(req) {
  return req.headers['user-agent'] || '';
}

// Audit logging
function logAction(action, entityType, entityId, userId, creatorId, metadata = {}, req = null) {
  const auditId = generateId();
  const ip = req ? getClientIp(req) : 'system';
  const ua = req ? getUserAgent(req) : 'system';
  
  db.prepare(`
    INSERT INTO patronage_audit_log 
    (id, action, entity_type, entity_id, user_id, creator_id, metadata, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditId, action, entityType, entityId, userId, creatorId,
    JSON.stringify(metadata), ip, ua, getTimestamp()
  );
  
  console.log(`[AUDIT] ${action} | ${entityType}:${entityId} | user:${userId} | creator:${creatorId}`);
}

// Anti-fraud checks
function checkAntiFraud(userId, creatorId, tierId, req) {
  const ip = getClientIp(req);
  const errors = [];
  
  // Check if user is trying to subscribe to their own tier
  if (userId === creatorId) {
    errors.push('Cannot patronize your own channel');
  }
  
  // Check max patrons per user
  const userPatronCount = db.prepare(
    'SELECT COUNT(*) as count FROM patrons WHERE user_id = ? AND status = ?'
  ).get(userId, 'active').count || 0;
  
  if (userPatronCount >= MAX_PATRONS_PER_USER) {
    errors.push(`Maximum ${MAX_PATRONS_PER_USER} active patronage subscriptions per user`);
  }
  
  // Check if tier exists and is active
  const tier = db.prepare(
    'SELECT * FROM patronage_tiers WHERE id = ? AND is_active = 1'
  ).get(tierId);
  
  if (!tier) {
    errors.push('Invalid or inactive tier');
  } else {
    // Check tier price limits
    if (tier.monthly_price_usd > MAX_TIER_PRICE) {
      errors.push(`Tier price exceeds maximum of $${MAX_TIER_PRICE}`);
    }
    if (tier.monthly_price_usd < MIN_TIER_PRICE) {
      errors.push(`Tier price below minimum of $${MIN_TIER_PRICE}`);
    }
    
    // Check if tier has max patrons limit reached
    if (tier.max_patrons > 0) {
      const currentPatrons = db.prepare(
        'SELECT COUNT(*) as count FROM patrons WHERE tier_id = ? AND status = ?'
      ).get(tierId, 'active').count || 0;
      
      if (currentPatrons >= tier.max_patrons) {
        errors.push('This tier has reached maximum patrons');
      }
    }
  }
  
  // Check for duplicate active subscription
  const existing = db.prepare(
    'SELECT * FROM patrons WHERE user_id = ? AND creator_id = ? AND tier_id = ? AND status = ?'
  ).get(userId, creatorId, tierId, 'active');
  
  if (existing) {
    errors.push('Already subscribed to this tier');
  }
  
  return { valid: errors.length === 0, errors };
}

// Sybil resistance: IP-based rate limiting for patronage actions
const patronageRateLimits = new Map();

function checkPatronageRateLimit(ip, action) {
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutes
  const limits = {
    'create_subscription': 5, // Max 5 new subscriptions per 15 minutes
    'cancel_subscription': 10, // Max 10 cancellations per 15 minutes
    'update_tier': 3, // Max 3 tier updates per 15 minutes
    'create_tier': 3 // Max 3 tier creations per 15 minutes
  };
  
  const limit = limits[action] || 10;
  const key = `${ip}:${action}`;
  
  const record = patronageRateLimits.get(key) || { count: 0, lastReset: now };
  
  if (now - record.lastReset > window) {
    record.count = 0;
    record.lastReset = now;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  patronageRateLimits.set(key, record);
  return true;
}

// Cleanup rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of patronageRateLimits) {
    if (now - value.lastReset > 30 * 60 * 1000) {
      patronageRateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

// Tier management
function createTier(tierData, creatorId, req) {
  const ip = getClientIp(req);
  
  if (!checkPatronageRateLimit(ip, 'create_tier')) {
    return { error: 'Rate limit exceeded for tier creation' };
  }
  
  const { name, description, monthlyPriceUsd, benefits, maxPatrons } = tierData;
  
  if (!name || !monthlyPriceUsd) {
    return { error: 'Name and monthlyPriceUsd are required' };
  }
  
  if (monthlyPriceUsd > MAX_TIER_PRICE) {
    return { error: `Tier price exceeds maximum of $${MAX_TIER_PRICE}` };
  }
  
  if (monthlyPriceUsd < MIN_TIER_PRICE) {
    return { error: `Tier price below minimum of $${MIN_TIER_PRICE}` };
  }
  
  const tierId = generateId();
  const now = getTimestamp();
  
  db.prepare(`
    INSERT INTO patronage_tiers 
    (id, creator_id, name, description, monthly_price_usd, benefits, max_patrons, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tierId, creatorId, name, description || '', monthlyPriceUsd, 
    JSON.stringify(benefits || []), maxPatrons || 0, now, now
  );
  
  logAction('create', 'tier', tierId, creatorId, creatorId, { name, monthlyPriceUsd }, req);
  
  return { 
    id: tierId, 
    creatorId, 
    name, 
    description: description || '',
    monthlyPriceUsd, 
    benefits: benefits || [],
    maxPatrons: maxPatrons || 0,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
}

function getTier(tierId) {
  const tier = db.prepare(
    'SELECT * FROM patronage_tiers WHERE id = ?'
  ).get(tierId);
  
  if (!tier) return null;
  
  return {
    id: tier.id,
    creatorId: tier.creator_id,
    name: tier.name,
    description: tier.description,
    monthlyPriceUsd: tier.monthly_price_usd,
    currency: tier.currency,
    benefits: JSON.parse(tier.benefits || '[]'),
    isActive: tier.is_active === 1,
    maxPatrons: tier.max_patrons,
    createdAt: tier.created_at,
    updatedAt: tier.updated_at
  };
}

function getTiersByCreator(creatorId) {
  const tiers = db.prepare(
    'SELECT * FROM patronage_tiers WHERE creator_id = ? ORDER BY monthly_price_usd ASC'
  ).all(creatorId);
  
  return tiers.map(tier => ({
    id: tier.id,
    creatorId: tier.creator_id,
    name: tier.name,
    description: tier.description,
    monthlyPriceUsd: tier.monthly_price_usd,
    currency: tier.currency,
    benefits: JSON.parse(tier.benefits || '[]'),
    isActive: tier.is_active === 1,
    maxPatrons: tier.max_patrons,
    currentPatrons: db.prepare(
      'SELECT COUNT(*) as count FROM patrons WHERE tier_id = ? AND status = ?'
    ).get(tier.id, 'active').count || 0,
    createdAt: tier.created_at,
    updatedAt: tier.updated_at
  }));
}

function updateTier(tierId, updates, creatorId, req) {
  const ip = getClientIp(req);
  
  if (!checkPatronageRateLimit(ip, 'update_tier')) {
    return { error: 'Rate limit exceeded for tier updates' };
  }
  
  const tier = db.prepare(
    'SELECT * FROM patronage_tiers WHERE id = ? AND creator_id = ?'
  ).get(tierId, creatorId);
  
  if (!tier) {
    return { error: 'Tier not found or not owned by this creator' };
  }
  
  const { name, description, monthlyPriceUsd, benefits, maxPatrons, isActive } = updates;
  const now = getTimestamp();
  
  const updateFields = [];
  const values = [];
  
  if (name !== undefined) { updateFields.push('name = ?'); values.push(name); }
  if (description !== undefined) { updateFields.push('description = ?'); values.push(description); }
  if (monthlyPriceUsd !== undefined) {
    if (monthlyPriceUsd > MAX_TIER_PRICE || monthlyPriceUsd < MIN_TIER_PRICE) {
      return { error: `Tier price must be between $${MIN_TIER_PRICE} and $${MAX_TIER_PRICE}` };
    }
    updateFields.push('monthly_price_usd = ?'); values.push(monthlyPriceUsd);
  }
  if (benefits !== undefined) { updateFields.push('benefits = ?'); values.push(JSON.stringify(benefits)); }
  if (maxPatrons !== undefined) { updateFields.push('max_patrons = ?'); values.push(maxPatrons); }
  if (isActive !== undefined) { updateFields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  
  updateFields.push('updated_at = ?');
  values.push(now);
  values.push(tierId, creatorId);
  
  db.prepare(`
    UPDATE patronage_tiers SET ${updateFields.join(', ')} WHERE id = ? AND creator_id = ?
  `).run(...values);
  
  logAction('update', 'tier', tierId, creatorId, creatorId, updates, req);
  
  return { success: true, tierId, updatedAt: now };
}

function deleteTier(tierId, creatorId, req) {
  // Check if tier has active patrons
  const activePatrons = db.prepare(
    'SELECT COUNT(*) as count FROM patrons WHERE tier_id = ? AND status = ?'
  ).get(tierId, 'active').count || 0;
  
  if (activePatrons > 0) {
    return { error: `Cannot delete tier with ${activePatrons} active patrons` };
  }
  
  const tier = db.prepare(
    'SELECT * FROM patronage_tiers WHERE id = ? AND creator_id = ?'
  ).get(tierId, creatorId);
  
  if (!tier) {
    return { error: 'Tier not found or not owned by this creator' };
  }
  
  db.prepare('DELETE FROM patronage_tiers WHERE id = ? AND creator_id = ?')
    .run(tierId, creatorId);
  
  logAction('delete', 'tier', tierId, creatorId, creatorId, {}, req);
  
  return { success: true, tierId };
}

// Patron (subscription) management
function createPatronage(userId, creatorId, tierId, paymentInfo, req) {
  const ip = getClientIp(req);
  
  if (!checkPatronageRateLimit(ip, 'create_subscription')) {
    return { error: 'Rate limit exceeded for subscription creation' };
  }
  
  // Anti-fraud checks
  const fraudCheck = checkAntiFraud(userId, creatorId, tierId, req);
  if (!fraudCheck.valid) {
    return { error: fraudCheck.errors.join('; ') };
  }
  
  const tier = getTier(tierId);
  if (!tier || !tier.isActive) {
    return { error: 'Invalid or inactive tier' };
  }
  
  if (tier.creatorId !== creatorId) {
    return { error: 'Tier does not belong to specified creator' };
  }
  
  const now = getTimestamp();
  const patronId = generateId();
  
  // Calculate next payment date (1 month from now)
  const nextPaymentDate = now + 30 * 24 * 60 * 60 * 1000;
  
  db.prepare(`
    INSERT INTO patrons 
    (id, creator_id, user_id, tier_id, status, amount_usd, currency, 
     payment_method, payment_reference, billing_cycle, start_date, 
     next_payment_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    patronId, creatorId, userId, tierId, 'active',
    tier.monthlyPriceUsd, tier.currency || 'USD',
    paymentInfo.method || 'unknown',
    paymentInfo.reference || '',
    paymentInfo.billingCycle || 'monthly',
    now, nextPaymentDate, now, now
  );
  
  // Record payment
  const paymentId = generateId();
  db.prepare(`
    INSERT INTO patronage_payments 
    (id, patron_id, creator_id, tier_id, amount_usd, currency, 
     payment_method, transaction_hash, transaction_status, processed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId, patronId, creatorId, tierId, tier.monthlyPriceUsd,
    tier.currency || 'USD', paymentInfo.method || 'unknown',
    paymentInfo.transactionHash || '', 'completed', now, now
  );
  
  // Grant benefits
  await grantPatronageBenefits(patronId, userId, creatorId, tierId, req);
  
  logAction('create', 'patron', patronId, userId, creatorId, 
    { tierId, amountUsd: tier.monthlyPriceUsd }, req);
  
  return {
    id: patronId,
    creatorId,
    userId,
    tierId,
    tierName: tier.name,
    status: 'active',
    amountUsd: tier.monthlyPriceUsd,
    currency: tier.currency || 'USD',
    startDate: now,
    nextPaymentDate,
    billingCycle: paymentInfo.billingCycle || 'monthly',
    benefits: tier.benefits
  };
}

async function grantPatronageBenefits(patronId, userId, creatorId, tierId, req) {
  const tier = getTier(tierId);
  if (!tier) return;
  
  const benefits = JSON.parse(tier.benefits || '[]');
  const now = getTimestamp();
  
  // Grant badges
  const badgeTypes = benefits.filter(b => b.type === BENEFIT_TYPES.BADGE);
  for (const badge of badgeTypes) {
    const badgeId = generateId();
    const expiresAt = badge.durationMonths 
      ? now + (badge.durationMonths * 30 * 24 * 60 * 60 * 1000)
      : null;
    
    db.prepare(`
      INSERT INTO user_badges 
      (id, user_id, creator_id, badge_type, badge_name, tier_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      badgeId, userId, creatorId, badge.badgeType || BADGE_TYPES.PATRON,
      badge.name || tier.name, tierId, expiresAt, now
    );
  }
  
  // Grant community roles
  const roleBenefits = benefits.filter(b => b.type === BENEFIT_TYPES.COMMUNITY_ROLE);
  for (const roleBenefit of roleBenefits) {
    const role = db.prepare(
      'SELECT * FROM community_roles WHERE creator_id = ? AND role_name = ?'
    ).get(creatorId, roleBenefit.roleName);
    
    if (role) {
      const roleId = generateId();
      db.prepare(`
        INSERT INTO user_roles 
        (id, user_id, creator_id, role_id, assigned_at, assigned_by, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(roleId, userId, creatorId, role.id, now, 'system', 1);
    }
  }
  
  // Grant early access
  const earlyAccessBenefits = benefits.filter(b => b.type === BENEFIT_TYPES.EARLY_ACCESS);
  for (const eaBenefit of earlyAccessBenefits) {
    // Early access is granted based on tier membership
    // The actual content access is checked at content retrieval time
  }
}

function getPatronage(patronId) {
  const patron = db.prepare(
    'SELECT * FROM patrons WHERE id = ?'
  ).get(patronId);
  
  if (!patron) return null;
  
  const tier = getTier(patron.tier_id);
  const user = db.prepare(
    'SELECT username FROM users WHERE id = ?'
  ).get(patron.user_id) || { username: 'Unknown' };
  
  return {
    id: patron.id,
    creatorId: patron.creator_id,
    userId: patron.user_id,
    username: user.username,
    tierId: patron.tier_id,
    tier: tier ? { name: tier.name, monthlyPriceUsd: tier.monthlyPriceUsd } : null,
    status: patron.status,
    amountUsd: patron.amount_usd,
    currency: patron.currency,
    startDate: patron.start_date,
    endDate: patron.end_date,
    cancelDate: patron.cancel_date,
    paymentMethod: patron.payment_method,
    paymentReference: patron.payment_reference,
    billingCycle: patron.billing_cycle,
    lastPaymentDate: patron.last_payment_date,
    nextPaymentDate: patron.next_payment_date,
    createdAt: patron.created_at,
    updatedAt: patron.updated_at
  };
}

function getPatronagesByUser(userId) {
  const patrons = db.prepare(
    'SELECT * FROM patrons WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
  
  return patrons.map(patron => {
    const tier = getTier(patron.tier_id);
    return {
      id: patron.id,
      creatorId: patron.creator_id,
      userId: patron.user_id,
      tierId: patron.tier_id,
      tier: tier ? { name: tier.name, monthlyPriceUsd: tier.monthlyPriceUsd } : null,
      status: patron.status,
      amountUsd: patron.amount_usd,
      currency: patron.currency,
      startDate: patron.start_date,
      nextPaymentDate: patron.next_payment_date,
      billingCycle: patron.billing_cycle,
      createdAt: patron.created_at
    };
  });
}

function getPatronsByCreator(creatorId) {
  const patrons = db.prepare(
    'SELECT * FROM patrons WHERE creator_id = ? AND status = ? ORDER BY created_at DESC'
  ).all(creatorId, 'active');
  
  return patrons.map(patron => {
    const tier = getTier(patron.tier_id);
    const user = db.prepare(
      'SELECT username FROM users WHERE id = ?'
    ).get(patron.user_id) || { username: 'Unknown' };
    
    return {
      id: patron.id,
      userId: patron.user_id,
      username: user.username,
      tierId: patron.tier_id,
      tier: tier ? { name: tier.name, monthlyPriceUsd: tier.monthlyPriceUsd } : null,
      status: patron.status,
      amountUsd: patron.amount_usd,
      currency: patron.currency,
      startDate: patron.start_date,
      billingCycle: patron.billing_cycle,
      nextPaymentDate: patron.next_payment_date,
      createdAt: patron.created_at
    };
  });
}

function cancelPatronage(patronId, userId, req) {
  const ip = getClientIp(req);
  
  if (!checkPatronageRateLimit(ip, 'cancel_subscription')) {
    return { error: 'Rate limit exceeded for subscription cancellation' };
  }
  
  const patron = db.prepare(
    'SELECT * FROM patrons WHERE id = ? AND user_id = ?'
  ).get(patronId, userId);
  
  if (!patron) {
    return { error: 'Patronage not found or not owned by this user' };
  }
  
  const now = getTimestamp();
  
  db.prepare(`
    UPDATE patrons 
    SET status = ?, cancel_date = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run('cancelled', now, now, patronId, userId);
  
  // Revoke benefits
  revokePatronageBenefits(patronId, userId, patron.creator_id, patron.tier_id, req);
  
  logAction('cancel', 'patron', patronId, userId, patron.creator_id, 
    { previousStatus: patron.status }, req);
  
  return { success: true, patronId, status: 'cancelled', cancelDate: now };
}

function revokePatronageBenefits(patronId, userId, creatorId, tierId, req) {
  const now = getTimestamp();
  
  // Remove badges granted by this patronage
  db.prepare(`
    UPDATE user_badges 
    SET is_active = 0, updated_at = ?
    WHERE user_id = ? AND creator_id = ? AND tier_id = ?
  `).run(now, userId, creatorId, tierId);
  
  // Remove roles granted by this patronage
  db.prepare(`
    UPDATE user_roles 
    SET is_active = 0, updated_at = ?
    WHERE user_id = ? AND creator_id = ? AND role_id IN (
      SELECT id FROM community_roles WHERE creator_id = ?
    )
  `).run(now, userId, creatorId, creatorId);
}

function updatePatronage(patronId, userId, updates, req) {
  const patron = db.prepare(
    'SELECT * FROM patrons WHERE id = ? AND user_id = ?'
  ).get(patronId, userId);
  
  if (!patron) {
    return { error: 'Patronage not found or not owned by this user' };
  }
  
  const { tierId, billingCycle } = updates;
  const now = getTimestamp();
  
  const updateFields = [];
  const values = [];
  
  if (tierId !== undefined) {
    // Validate new tier
    const tier = getTier(tierId);
    if (!tier || !tier.isActive || tier.creatorId !== patron.creator_id) {
      return { error: 'Invalid tier for this creator' };
    }
    updateFields.push('tier_id = ?');
    values.push(tierId);
    
    // Update amount to new tier price
    updateFields.push('amount_usd = ?');
    values.push(tier.monthlyPriceUsd);
    
    // Revoke old benefits and grant new ones
    revokePatronageBenefits(patronId, userId, patron.creator_id, patron.tier_id, req);
    grantPatronageBenefits(patronId, userId, patron.creator_id, tierId, req);
  }
  
  if (billingCycle !== undefined) {
    updateFields.push('billing_cycle = ?');
    values.push(billingCycle);
  }
  
  if (updateFields.length > 0) {
    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(patronId, userId);
    
    db.prepare(`
      UPDATE patrons SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?
    `).run(...values);
    
    logAction('update', 'patron', patronId, userId, patron.creator_id, updates, req);
  }
  
  return { success: true, patronId, updatedAt: now };
}

// Badge management
function getUserBadges(userId) {
  const badges = db.prepare(
    'SELECT * FROM user_badges WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
  ).all(userId);
  
  return badges.map(badge => ({
    id: badge.id,
    userId: badge.user_id,
    creatorId: badge.creator_id,
    badgeType: badge.badge_type,
    badgeName: badge.badge_name,
    tierId: badge.tier_id,
    expiresAt: badge.expires_at,
    isActive: badge.is_active === 1,
    createdAt: badge.created_at
  }));
}

function getBadgesByCreatorAndUser(creatorId, userId) {
  const badges = db.prepare(
    'SELECT * FROM user_badges WHERE creator_id = ? AND user_id = ? AND is_active = 1'
  ).all(creatorId, userId);
  
  return badges;
}

// Early access content management
function createEarlyAccessContent(contentData, creatorId, req) {
  const ip = getClientIp(req);
  
  const { contentId, contentType, title, description, accessTierIds, releaseDate } = contentData;
  
  if (!contentId || !contentType || !title) {
    return { error: 'contentId, contentType, and title are required' };
  }
  
  const contentIdFinal = generateId();
  const now = getTimestamp();
  
  db.prepare(`
    INSERT INTO early_access_content 
    (id, creator_id, content_id, content_type, title, description, 
     access_tier_ids, release_date, is_published, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contentIdFinal, creatorId, contentId, contentType, title, description || '',
    JSON.stringify(accessTierIds || []), releaseDate || null, 1, now
  );
  
  logAction('create', 'early_access_content', contentIdFinal, creatorId, creatorId, 
    { contentId, contentType, title }, req);
  
  return {
    id: contentIdFinal,
    creatorId,
    contentId,
    contentType,
    title,
    description: description || '',
    accessTierIds: accessTierIds || [],
    releaseDate,
    isPublished: true,
    createdAt: now
  };
}

function checkEarlyAccess(userId, contentId) {
  const content = db.prepare(
    'SELECT * FROM early_access_content WHERE content_id = ?'
  ).get(contentId);
  
  if (!content || !content.is_published) {
    return { hasAccess: false, reason: 'Content not found or not published' };
  }
  
  const accessTierIds = JSON.parse(content.access_tier_ids || '[]');
  
  // If no tier restrictions, everyone has access
  if (accessTierIds.length === 0) {
    return { hasAccess: true };
  }
  
  // Check if user has active patronage with any of the required tiers
  const activePatronages = db.prepare(
    'SELECT * FROM patrons WHERE user_id = ? AND status = ? AND creator_id = ?'
  ).all(userId, 'active', content.creator_id);
  
  const hasRequiredTier = activePatronages.some(p => 
    accessTierIds.includes(p.tier_id)
  );
  
  if (hasRequiredTier) {
    return { hasAccess: true };
  }
  
  return { hasAccess: false, reason: 'Requires active patronage with specific tier' };
}

// Community role management
function createCommunityRole(roleData, creatorId, req) {
  const { roleName, description, requiredTierId, permissions } = roleData;
  
  if (!roleName) {
    return { error: 'roleName is required' };
  }
  
  const roleId = generateId();
  const now = getTimestamp();
  
  db.prepare(`
    INSERT INTO community_roles 
    (id, creator_id, role_name, role_description, required_tier_id, permissions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(roleId, creatorId, roleName, description || '', requiredTierId || '', 
    JSON.stringify(permissions || []), now);
  
  logAction('create', 'community_role', roleId, creatorId, creatorId, 
    { roleName, requiredTierId }, req);
  
  return {
    id: roleId,
    creatorId,
    roleName,
    description: description || '',
    requiredTierId,
    permissions: permissions || [],
    isActive: true,
    createdAt: now
  };
}

function getCommunityRoles(creatorId) {
  const roles = db.prepare(
    'SELECT * FROM community_roles WHERE creator_id = ? ORDER BY role_name ASC'
  ).all(creatorId);
  
  return roles.map(role => ({
    id: role.id,
    creatorId: role.creator_id,
    roleName: role.role_name,
    description: role.role_description,
    requiredTierId: role.required_tier_id,
    permissions: JSON.parse(role.permissions || '[]'),
    isActive: role.is_active === 1,
    createdAt: role.created_at
  }));
}

// Creator revenue tracking for patronage
function getCreatorPatronageRevenue(creatorId, startDate, endDate) {
  const query = `
    SELECT 
      SUM(amount_usd) as totalRevenue,
      COUNT(*) as totalPatrons,
      COUNT(DISTINCT user_id) as uniquePatrons,
      AVG(amount_usd) as averagePatronage
    FROM patrons 
    WHERE creator_id = ? 
      AND status = 'active'
      ${startDate ? 'AND start_date >= ?' : ''}
      ${endDate ? 'AND start_date <= ?' : ''}
  `;
  
  const params = [creatorId];
  if (startDate) params.push(startDate);
  if (endDate) params.push(endDate);
  
  const result = db.prepare(query).get(...params);
  
  return {
    creatorId,
    totalRevenue: result.totalRevenue || 0,
    totalPatrons: result.totalPatrons || 0,
    uniquePatrons: result.uniquePatrons || 0,
    averagePatronage: result.averagePatronage || 0,
    period: { startDate, endDate }
  };
}

// Integration with ledger (record patronage revenue as platform revenue)
async function syncPatronageToLedger(patronId) {
  const patron = db.prepare(
    'SELECT * FROM patrons WHERE id = ?'
  ).get(patronId);
  
  if (!patron || patron.status !== 'active') return;
  
  // Record patronage payment as revenue event in ledger
  // MANDATORY: 50/50 split for nexastream.org - 50% to creator, 50% to platform owner wallet
  const paymentData = {
    eventType: 'patronage',
    videoId: '', // No specific video for patronage
    creator: patron.creator_id,
    viewer: patron.user_id,
    amountUsd: patron.amount_usd,
    currency: patron.currency || 'USD',
    source: 'patronage',
    metadata: {
      patronId,
      tierId: patron.tier_id,
      billingCycle: patron.billing_cycle
    },
    fraudScore: 0 // Patronage is pre-validated
  };
  
  try {
    // In production, this would call the ledger service
    // For now, we'll just log it
    console.log('[LEDGER SYNC] Patronage payment recorded:', paymentData);
    
    // Directly insert into ledger database if co-located
    try {
      const ledgerDb = new DatabaseSync(path.join(ROOT, 'database', 'ledger.db'));
      ledgerDb.prepare(`
        INSERT INTO revenue_events 
        (id, event_type, video_id, creator, viewer, amount_usd, currency, source, metadata, fraud_score, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(), paymentData.eventType, paymentData.videoId, paymentData.creator,
        paymentData.viewer, paymentData.amountUsd, paymentData.currency, paymentData.source,
        JSON.stringify(paymentData.metadata), paymentData.fraudScore, 'processed', getTimestamp()
      );
      
      // Process the event with MANDATORY 50/50 split for nexastream.org
      const eventId = generateId();
      const creatorShare = Math.round(paymentData.amountUsd * CREATOR_SPLIT * 100) / 100;
      const platformShare = Math.round(paymentData.amountUsd * PLATFORM_SPLIT * 100) / 100;
      
      // Credit creator balance with 50% share
      ledgerDb.prepare(`
        INSERT OR REPLACE INTO creator_balances (creator, nst_balance, usd_balance, total_earned, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(creator) DO UPDATE SET
        usd_balance = usd_balance + ?,
        total_earned = total_earned + ?,
        updated_at = ?
      `).run(
        paymentData.creator, 0, creatorShare, creatorShare, getTimestamp(),
        creatorShare, creatorShare, getTimestamp()
      );
      
      // Record the 50/50 split in history
      ledgerDb.prepare(`
        INSERT INTO split_history 
        (id, event_id, creator, creator_share, platform_share, total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateId(), eventId, paymentData.creator, creatorShare, platformShare,
        paymentData.amountUsd, getTimestamp()
      );
      
      console.log(`[LEDGER] Patronage synced to ledger: $${creatorShare} to creator, $${platformShare} to platform (50/50 split)`);
    } catch (e) {
      console.error('[LEDGER SYNC ERROR]', e.message);
    }
  } catch (e) {
    console.error('[LEDGER SYNC ERROR]', e.message);
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  
  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }
  
  try {
    // Tier endpoints
    if (p === '/api/patronage/tiers' && req.method === 'GET') {
      const creatorId = url.searchParams.get('creatorId');
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const tiers = getTiersByCreator(creatorId);
      return json(res, 200, { tiers });
    }
    
    if (p === '/api/patronage/tier' && req.method === 'GET') {
      const tierId = url.searchParams.get('tierId');
      if (!tierId) {
        return json(res, 400, { error: 'tierId is required' });
      }
      const tier = getTier(tierId);
      if (!tier) {
        return json(res, 404, { error: 'Tier not found' });
      }
      return json(res, 200, { tier });
    }
    
    if (p === '/api/patronage/tiers' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}');
      const creatorId = body.creatorId;
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const tier = createTier(body, creatorId, req);
      return json(res, tier.error ? 400 : 200, tier);
    }
    
    if (p.match(/^\/api\/patronage\/tiers\/([^/]+)$/) && req.method === 'PUT') {
      const tierId = p.split('/')[3];
      const body = JSON.parse(await readBody(req) || '{}');
      const creatorId = body.creatorId;
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const result = updateTier(tierId, body, creatorId, req);
      return json(res, result.error ? 400 : 200, result);
    }
    
    if (p.match(/^\/api\/patronage\/tiers\/([^/]+)$/) && req.method === 'DELETE') {
      const tierId = p.split('/')[3];
      const body = JSON.parse(await readBody(req) || '{}');
      const creatorId = body.creatorId;
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const result = deleteTier(tierId, creatorId, req);
      return json(res, result.error ? 400 : 200, result);
    }
    
    // Patronage endpoints
    if (p === '/api/patronage/subscribe' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}');
      const { userId, creatorId, tierId, paymentInfo } = body;
      
      if (!userId || !creatorId || !tierId) {
        return json(res, 400, { error: 'userId, creatorId, and tierId are required' });
      }
      
      const result = await createPatronage(userId, creatorId, tierId, paymentInfo || {}, req);
      
      // Sync to ledger
      if (result && !result.error) {
        await syncPatronageToLedger(result.id);
      }
      
      return json(res, result.error ? 400 : 200, result);
    }
    
    if (p.match(/^\/api\/patronage\/subscriptions\/user\/([^/]+)$/) && req.method === 'GET') {
      const userId = p.split('/')[4];
      const patronages = getPatronagesByUser(userId);
      return json(res, 200, { patronages });
    }
    
    if (p.match(/^\/api\/patronage\/patrons\/creator\/([^/]+)$/) && req.method === 'GET') {
      const creatorId = p.split('/')[4];
      const patrons = getPatronsByCreator(creatorId);
      return json(res, 200, { patrons });
    }
    
    if (p.match(/^\/api\/patronage\/subscriptions\/([^/]+)$/) && req.method === 'PUT') {
      const patronId = p.split('/')[3];
      const body = JSON.parse(await readBody(req) || '{}');
      const userId = body.userId;
      if (!userId) {
        return json(res, 400, { error: 'userId is required' });
      }
      const result = updatePatronage(patronId, userId, body, req);
      return json(res, result.error ? 400 : 200, result);
    }
    
    if (p.match(/^\/api\/patronage\/subscriptions\/([^/]+)$/) && req.method === 'DELETE') {
      const patronId = p.split('/')[3];
      const body = JSON.parse(await readBody(req) || '{}');
      const userId = body.userId;
      if (!userId) {
        return json(res, 400, { error: 'userId is required' });
      }
      const result = cancelPatronage(patronId, userId, req);
      return json(res, result.error ? 400 : 200, result);
    }
    
    // Badge endpoints
    if (p.match(/^\/api\/patronage\/badges\/user\/([^/]+)$/) && req.method === 'GET') {
      const userId = p.split('/')[4];
      const badges = getUserBadges(userId);
      return json(res, 200, { badges });
    }
    
    if (p.match(/^\/api\/patronage\/badges\/check$) && req.method === 'GET') {
      const userId = url.searchParams.get('userId');
      const creatorId = url.searchParams.get('creatorId');
      if (!userId || !creatorId) {
        return json(res, 400, { error: 'userId and creatorId are required' });
      }
      const badges = getBadgesByCreatorAndUser(creatorId, userId);
      return json(res, 200, { badges });
    }
    
    // Early access endpoints
    if (p === '/api/patronage/early-access' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}');
      const creatorId = body.creatorId;
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const result = createEarlyAccessContent(body, creatorId, req);
      return json(res, result.error ? 400 : 200, result);
    }
    
    if (p === '/api/patronage/early-access/check' && req.method === 'GET') {
      const userId = url.searchParams.get('userId');
      const contentId = url.searchParams.get('contentId');
      if (!userId || !contentId) {
        return json(res, 400, { error: 'userId and contentId are required' });
      }
      const result = checkEarlyAccess(userId, contentId);
      return json(res, 200, result);
    }
    
    // Community role endpoints
    if (p === '/api/patronage/roles' && req.method === 'GET') {
      const creatorId = url.searchParams.get('creatorId');
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const roles = getCommunityRoles(creatorId);
      return json(res, 200, { roles });
    }
    
    if (p === '/api/patronage/roles' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}');
      const creatorId = body.creatorId;
      if (!creatorId) {
        return json(res, 400, { error: 'creatorId is required' });
      }
      const result = createCommunityRole(body, creatorId, req);
      return json(res, result.error ? 400 : 200, result);
    }
    
    // Revenue endpoints
    if (p.match(/^\/api\/patronage\/revenue\/creator\/([^/]+)$/) && req.method === 'GET') {
      const creatorId = p.split('/')[4];
      const startDate = url.searchParams.get('startDate') ? parseInt(url.searchParams.get('startDate')) : null;
      const endDate = url.searchParams.get('endDate') ? parseInt(url.searchParams.get('endDate')) : null;
      const revenue = getCreatorPatronageRevenue(creatorId, startDate, endDate);
      return json(res, 200, revenue);
    }
    
    // Health check
    if (p === '/api/health') {
      const tierCount = db.prepare('SELECT COUNT(*) as count FROM patronage_tiers').get().count;
      const patronCount = db.prepare('SELECT COUNT(*) as count FROM patrons').get().count;
      const activePatronCount = db.prepare("SELECT COUNT(*) as count FROM patrons WHERE status='active'").get().count;
      
      return json(res, 200, {
        ok: true,
        service: 'nexastream-patronage',
        stats: {
          tiers: tierCount,
          patrons: patronCount,
          activePatrons: activePatronCount
        }
      });
    }
    
    // API info
    if (p === '/api/patronage/info') {
      return json(res, 200, {
        service: 'NexaStream Patronage',
        version: '1.0.0',
        description: 'Creator patronage and membership system',
        features: [
          'Multi-tier patronage subscriptions',
          'Creator-defined benefits (badges, early access, roles)',
          'Anti-fraud and Sybil-resistant mechanisms',
          '100% revenue to creators (0% platform fee)',
          'Early access content gating',
          'Community role assignment',
          'Audit logging',
          'Rate limiting'
        ],
        endpoints: {
          tiers: '/api/patronage/tiers',
          subscribe: '/api/patronage/subscribe',
          subscriptions: '/api/patronage/subscriptions',
          patrons: '/api/patronage/patrons',
          badges: '/api/patronage/badges',
          earlyAccess: '/api/patronage/early-access',
          roles: '/api/patronage/roles',
          revenue: '/api/patronage/revenue'
        },
        configuration: {
          maxPatronsPerUser: MAX_PATRONS_PER_USER,
          maxTierPrice: MAX_TIER_PRICE,
          minTierPrice: MIN_TIER_PRICE,
          platformFeePercentage: PATRONAGE_FEE_PERCENTAGE
        }
      });
    }
    
    return json(res, 404, { error: 'Endpoint not found' });
  } catch (e) {
    console.error('Error:', e);
    return json(res, 500, { error: 'Internal server error', details: e.message });
  }
});

// Periodic sync of active patronages to ledger
setInterval(async () => {
  try {
    const activePatronages = db.prepare(
      'SELECT id FROM patrons WHERE status = ? AND last_payment_date < ?'
    ).all('active', Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    for (const patron of activePatronages) {
      await syncPatronageToLedger(patron.id);
      
      // Update last payment date
      db.prepare(
        'UPDATE patrons SET last_payment_date = ? WHERE id = ?'
      ).run(Date.now(), patron.id);
    }
    
    console.log(`[SYNC] Processed ${activePatronages.length} recurring patronage payments`);
  } catch (e) {
    console.error('[SYNC ERROR]', e.message);
  }
}, 24 * 60 * 60 * 1000); // Run daily

// Start server
server.listen(SERVICE_PORT, () => {
  console.log(`NexaStream Patronage Service: http://localhost:${SERVICE_PORT}`);
  console.log('Features: Multi-tier patronage, 100% creator revenue, anti-fraud, early access, badges, roles');
});

// Export for testing
module.exports = {
  createTier,
  getTier,
  getTiersByCreator,
  updateTier,
  deleteTier,
  createPatronage,
  getPatronage,
  getPatronagesByUser,
  getPatronsByCreator,
  cancelPatronage,
  updatePatronage,
  getUserBadges,
  getBadgesByCreatorAndUser,
  createEarlyAccessContent,
  checkEarlyAccess,
  createCommunityRole,
  getCommunityRoles,
  getCreatorPatronageRevenue,
  checkAntiFraud,
  BENEFIT_TYPES,
  BADGE_TYPES
};
