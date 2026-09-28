# NexaStream Patronage Service

> **Patronage Service v1.0.0** - Creator patronage and membership system with MANDATORY 50/50 split for nexastream.org

## Overview

The NexaStream Patronage Service implements a complete creator patronage and membership system that allows creators to offer subscription-based support tiers to their audience. This system is designed to be **Sybil-resistant** and **anti-fraud** while providing a seamless experience for both creators and patrons.

### Key Features

- **Multi-tier patronage subscriptions** - Creators can define multiple subscription levels with different benefits
- **MANDATORY 50/50 split** - 50% to creator, 50% to platform owner wallet (nexastream.org requirement)
- **Anti-fraud mechanisms** - IP-based rate limiting, self-patronage prevention, duplicate detection
- **Sybil-resistant** - Multiple layers of protection against fake accounts and abuse
- **Benefit system** - Badges, early access, community roles, exclusive content, and more
- **Audit logging** - Complete audit trail for all patronage actions
- **Early access content** - Gate content behind specific patronage tiers
- **Community roles** - Assign special roles to patrons based on their tier
- **Recurring payments** - Automatic monthly billing with payment tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Patronage Service                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Tier Service  │  │ Patron Service │  │ Benefit Service   │   │
│  │              │  │                │  │                    │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Anti-Fraud    │  │ Rate Limiting │  │ Audit Logging     │   │
│  │ Module        │  │ Module        │  │ Module            │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Database                            │
│  - patronage_tiers                                          │
│  - patrons                                                  │
│  - patronage_benefits                                       │
│  - user_badges                                             │
│  - early_access_content                                    │
│  - community_roles                                          │
│  - user_roles                                              │
│  - patronage_payments                                       │
│  - patronage_audit_log                                      │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### patronage_tiers
Stores subscription tiers defined by creators.

```sql
CREATE TABLE patronage_tiers (
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
```

### patrons
Stores active patronage subscriptions.

```sql
CREATE TABLE patrons (
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
```

### patronage_benefits
Defines benefits available for each tier.

```sql
CREATE TABLE patronage_benefits (
  id TEXT PRIMARY KEY,
  tier_id TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  benefit_value TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);
```

### user_badges
Stores badges earned by users from their patronage.

```sql
CREATE TABLE user_badges (
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
```

### early_access_content
Stores content that is gated behind patronage tiers.

```sql
CREATE TABLE early_access_content (
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
```

### community_roles
Defines special roles that can be assigned to patrons.

```sql
CREATE TABLE community_roles (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  role_description TEXT,
  required_tier_id TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);
```

### user_roles
Assigns roles to specific users.

```sql
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at INTEGER DEFAULT (strftime('%s','now')*1000),
  assigned_by TEXT,
  is_active INTEGER DEFAULT 1
);
```

### patronage_payments
Tracks all patronage payments.

```sql
CREATE TABLE patronage_payments (
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
```

### patronage_audit_log
Complete audit trail for all actions.

```sql
CREATE TABLE patronage_audit_log (
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
```

## API Endpoints

### Tier Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patronage/tiers?creatorId={creatorId}` | Get all tiers for a creator |
| GET | `/api/patronage/tier?tierId={tierId}` | Get a specific tier |
| POST | `/api/patronage/tiers` | Create a new tier |
| PUT | `/api/patronage/tiers/{tierId}` | Update a tier |
| DELETE | `/api/patronage/tiers/{tierId}` | Delete a tier |

### Patronage (Subscription) Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patronage/subscribe` | Create a new patronage subscription |
| GET | `/api/patronage/subscriptions/user/{userId}` | Get all patronages for a user |
| GET | `/api/patronage/patrons/creator/{creatorId}` | Get all patrons for a creator |
| PUT | `/api/patronage/subscriptions/{patronId}` | Update a patronage |
| DELETE | `/api/patronage/subscriptions/{patronId}` | Cancel a patronage |

### Badge Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patronage/badges/user/{userId}` | Get all badges for a user |
| GET | `/api/patronage/badges/check?userId={userId}&creatorId={creatorId}` | Check user badges for a creator |

### Early Access Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patronage/early-access` | Create early access content |
| GET | `/api/patronage/early-access/check?userId={userId}&contentId={contentId}` | Check if user has early access |

### Community Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patronage/roles?creatorId={creatorId}` | Get all roles for a creator |
| POST | `/api/patronage/roles` | Create a new role |

### Revenue Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patronage/revenue/creator/{creatorId}` | Get patronage revenue for a creator |

### Service Information

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patronage/info` | Get service information and configuration |
| GET | `/api/health` | Health check endpoint |

## Anti-Fraud & Sybil Resistance

### Implemented Protections

1. **Self-Patronage Prevention**
   - Users cannot subscribe to their own patronage tiers
   - Prevents creators from artificially inflating their patron count

2. **Rate Limiting**
   - IP-based rate limiting for all patronage actions
   - Limits: 5 new subscriptions, 10 cancellations per 15 minutes per IP
   - Prevents automated abuse and brute force attacks

3. **Duplicate Detection**
   - Prevents duplicate active subscriptions to the same tier
   - Unique constraint on (creator_id, user_id, tier_id) in database

4. **Max Patrons Per User**
   - Each user can have a maximum of 100 active patronage subscriptions
   - Prevents single users from supporting too many creators (potential abuse)

5. **Tier Price Limits**
   - Minimum tier price: $0.99 USD
   - Maximum tier price: $10,000 USD
   - Prevents extreme values that could indicate fraud

6. **Tier Capacity Limits**
   - Optional max_patrons limit per tier
   - Enforces scarcity and prevents unlimited growth

7. **Payment Validation**
   - All payments are validated and recorded
   - Transaction hashes are stored for verification

8. **Audit Logging**
   - Complete audit trail for all actions
   - Includes IP addresses and user agents
   - Enables forensic analysis of suspicious activity

## Benefit Types

The system supports the following benefit types:

| Type | Description | Example |
|------|-------------|---------|
| `badge` | Display badge on user profile | "Gold Patron", "VIP Supporter" |
| `early_access` | Access to content before public release | "24-hour early access" |
| `community_role` | Special role in creator's community | "Moderator", "VIP" |
| `exclusive_content` | Access to patron-only content | "Behind the scenes videos" |
| `live_chat_access` | Access to live chat during streams | "Live Q&A access" |
| `custom_emoji` | Custom emoji in chat | ":myemoji:" |
| `credits` | Special credits/recognition | "Thank you in video description" |
| `discount` | Discount on merchandise/services | "10% off merch" |

## Badge Types

Standard badge types available:

- `patron` - Basic patron badge
- `supporter` - Supporter badge
- `vip` - VIP badge
- `founder` - Founder badge (early supporters)
- `sponsor` - Sponsor badge (high-value supporters)
- `custom` - Custom badge defined by creator

## Integration with Ledger

The Patronage Service integrates with the existing Ledger service to record patronage revenue:

1. When a new patronage is created, it's automatically synced to the ledger
2. Revenue is recorded as `patronage` event type
3. **100% of patronage revenue goes to the creator** (0% platform fee)
4. The ledger tracks all patronage payments for transparency

### Revenue Split

- Creator: 50% (MANDATORY for nexastream.org)
- Platform Owner Wallet: 50% (MANDATORY for nexastream.org)

This is the MANDATORY split for nexastream.org domain as specified in the product requirements.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3017 |
| `CORE_API_URL` | Core API URL | http://localhost:3002 |
| `LEDGER_API_URL` | Ledger API URL | http://localhost:3016 |

### Constants (Configurable in Code)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_PATRONS_PER_USER` | 100 | Max simultaneous subscriptions per user |
| `MAX_TIER_PRICE` | 10000 | Maximum tier price in USD |
| `MIN_TIER_PRICE` | 0.99 | Minimum tier price in USD |
| `CREATOR_SPLIT` | 0.50 | Creator share (50% - MANDATORY for nexastream.org) |
| `PLATFORM_SPLIT` | 0.50 | Platform owner wallet share (50% - MANDATORY for nexastream.org) |

## Usage Examples

### Creating a Tier

```javascript
const tier = await createTier({
  creatorId: 'my-username',
  name: 'Gold Supporter',
  description: 'Exclusive access to all premium content',
  monthlyPriceUsd: 10.00,
  benefits: [
    { type: 'badge', badgeType: 'patron', badgeName: 'Gold Patron' },
    { type: 'early_access', name: '24-hour early access' },
    { type: 'community_role', roleName: 'VIP Member' }
  ],
  maxPatrons: 100
});
```

### Subscribing to a Tier

```javascript
const patronage = await createPatronage(
  'user-123',
  'creator-456',
  'tier-789',
  {
    method: 'credit_card',
    reference: 'stripe_payment_123',
    transactionHash: 'txn_abc123',
    billingCycle: 'monthly'
  }
);
```

### Checking Early Access

```javascript
const hasAccess = await checkEarlyAccess('user-123', 'video-456');
if (hasAccess.hasAccess) {
  // Show the content
} else {
  // Show upgrade prompt
}
```

### Getting User Badges

```javascript
const badges = await getUserBadges('user-123');
// Display badges on user profile
```

## Testing

Run the test suite:

```bash
cd services/patronage
node test.js
```

The test suite covers:
- Tier creation and management
- Anti-fraud mechanisms
- Patronage creation and cancellation
- Badge system
- Early access content
- Community roles
- Revenue tracking

## Deployment

### Development

```bash
cd services/patronage
node server.js
```

Service will be available at `http://localhost:3017`

### Production

```bash
# Set environment variables
PORT=3017
CORE_API_URL=https://api.nexastream.org
LEDGER_API_URL=https://ledger.nexastream.org

# Run with PM2 or similar
pm2 start server.js --name nexastream-patronage
```

## Security Considerations

### Data Protection

- All sensitive data is stored in SQLite database
- Database files should be protected with appropriate filesystem permissions
- Regular backups recommended

### Audit Trail

- All actions are logged with:
  - Action type
  - Entity type and ID
  - User ID and Creator ID
  - IP address
  - User agent
  - Timestamp
  - Metadata

### Rate Limiting

- Implemented at the IP level
- Separate limits for different action types
- Automatic cleanup of old rate limit records

## Performance Considerations

### Database Indexes

The following indexes are created for optimal query performance:

- `idx_patrons_creator` - For querying patrons by creator
- `idx_patrons_user` - For querying patronages by user
- `idx_patrons_status` - For filtering by status
- `idx_patrons_tier` - For querying by tier
- `idx_tiers_creator` - For querying tiers by creator
- `idx_user_badges_user` - For querying badges by user
- `idx_user_badges_creator` - For querying badges by creator
- `idx_early_access_creator` - For querying early access content by creator
- `idx_user_roles_user` - For querying user roles by user
- `idx_user_roles_creator` - For querying user roles by creator

### Memory Usage

- Rate limit map is cleaned up every 5 minutes
- Maximum size of rate limit map is controlled
- No memory leaks from growing data structures

## Future Enhancements

- [ ] Email notifications for new patrons
- [ ] Patronage analytics dashboard
- [ ] Tier comparison and recommendations
- [ ] Bulk tier management
- [ ] Patron management (manual additions, removals)
- [ ] Refund processing
- [ ] Chargeback handling
- [ ] Subscription pausing
- [ ] Gift subscriptions

## License

This service is part of the NexaStream platform and is proprietary software.

## Support

For issues or questions, refer to the main NexaStream documentation or contact the development team.
