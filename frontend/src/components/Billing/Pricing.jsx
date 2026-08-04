'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Professional',
    price: 10,
    interval: 'month',
    features: [
      'Full API Access',
      'NFT Minting (100/month)',
      'DAO Voting Rights',
      'Creator Verification',
      'Marketplace Access',
      'Analytics Dashboard',
      'Email Support',
      'Community Access',
    ],
    limits: { apiCalls: 10000, nftMints: 100, storage: '10GB' },
  },
  annual: {
    id: 'annual',
    name: 'Professional Annual',
    price: 100,
    interval: 'year',
    savings: '17%',
    features: [
      'Everything in Monthly',
      'NFT Minting (1,500/year)',
      'Priority Support',
      'Early Access Features',
      'Custom Branding',
      'Advanced Analytics',
      'API Rate Limit: 50,000/month',
      'Dedicated Slack Channel',
    ],
    limits: { apiCalls: 50000, nftMints: 1500, storage: '100GB' },
  },
  lifetime: {
    id: 'lifetime',
    name: 'Enterprise Lifetime',
    price: 1000,
    interval: 'lifetime',
    badge: 'BEST VALUE',
    features: [
      'Unlimited API Access',
      'Unlimited NFT Minting',
      'White-Label License',
      'Source Code Access',
      'Full Trade Secrets',
      'Priority Enterprise Support',
      'Custom Contract Deployment',
      'API Rate Limit: UNLIMITED',
      'Dedicated Account Manager',
      'Quarterly Strategy Sessions',
      'All Future Features',
      'Perpetual License',
    ],
    limits: { apiCalls: 'UNLIMITED', nftMints: 'UNLIMITED', storage: 'UNLIMITED' },
  },
  payPerUse: {
    id: 'payPerUse',
    name: 'Pay As You Go',
    price: null,
    interval: 'usage',
    features: [
      'API Access (per call)',
      'NFT Minting (per unit)',
      'Storage (per GB)',
      'No Commitment',
      'No Monthly Fees',
      'Scale On Demand',
    ],
  },
};

export default function Pricing() {
  const { address, isConnected } = useAccount();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [copied, setCopied] = useState(false);

  const copyLicenseKey = () => {
    const licenseKey = `NEXA-${address?.slice(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>NexaStream Enterprise</h1>
        <p>Revolutionary Blockchain Technology for Content Creators</p>
        <div className="license-badge">
          <span className="badge-icon">L</span>
          <div>
            <strong>Full License Included</strong>
            <p>Perpetual rights, source code access, trade secrets</p>
          </div>
        </div>
      </div>

      <div className="billing-toggle">
        <button className={billingCycle === 'monthly' ? 'active' : ''} onClick={() => setBillingCycle('monthly')}>
          Monthly
        </button>
        <button className={billingCycle === 'annual' ? 'active' : ''} onClick={() => setBillingCycle('annual')}>
          Annual <span className="save-badge">Save 17%</span>
        </button>
      </div>

      <div className="plans-grid">
        {/* Pay Per Use */}
        <div className="plan-card">
          <div className="plan-header">
            <h3>Pay As You Go</h3>
            <p className="plan-desc">No commitment, scale on demand</p>
          </div>
          <div className="plan-price">
            <span className="price-label">Starting at</span>
            <span className="price-amount">$0.001</span>
            <span className="price-unit">per API call</span>
          </div>
          <ul className="plan-features">
            {PLANS.payPerUse.features.map((f, i) => <li key={i}>+ {f}</li>)}
          </ul>
          <button className="plan-btn secondary">Get Started</button>
          <div className="usage-pricing">
            <h4>Usage-Based Pricing</h4>
            <table>
              <tbody>
                <tr><td>API Call</td><td>$0.001</td></tr>
                <tr><td>NFT Mint</td><td>$0.10</td></tr>
                <tr><td>Storage (GB)</td><td>$0.05</td></tr>
                <tr><td>Contract Deploy</td><td>$1.00</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Plan */}
        <div className="plan-card">
          <div className="plan-header">
            <h3>Professional</h3>
            <p className="plan-desc">Full access for individual creators</p>
          </div>
          <div className="plan-price">
            <span className="price-amount">$10</span>
            <span className="price-unit">/month</span>
          </div>
          <ul className="plan-features">
            {PLANS.monthly.features.map((f, i) => <li key={i}>+ {f}</li>)}
          </ul>
          <div className="plan-limits">
            <span>{PLANS.monthly.limits.apiCalls.toLocaleString()} API calls/mo</span>
            <span>{PLANS.monthly.limits.nftMints} NFT mints/mo</span>
          </div>
          <button className="plan-btn primary">Subscribe - $10/mo</button>
        </div>

        {/* Lifetime Plan */}
        <div className="plan-card featured">
          <div className="featured-badge">{PLANS.lifetime.badge}</div>
          <div className="plan-header">
            <h3>{PLANS.lifetime.name}</h3>
            <p className="plan-desc">Complete ownership, perpetual license</p>
          </div>
          <div className="plan-price">
            <span className="price-amount">$1,000</span>
            <span className="price-unit">one-time</span>
          </div>
          <div className="savings-note">Includes ALL future updates</div>
          <ul className="plan-features">
            {PLANS.lifetime.features.map((f, i) => <li key={i}>+ {f}</li>)}
          </ul>
          <div className="plan-limits">
            <span>{PLANS.lifetime.limits.apiCalls} API calls</span>
            <span>{PLANS.lifetime.limits.nftMints} NFT mints</span>
          </div>
          <button className="plan-btn cta">Get Lifetime Access - $1,000</button>
        </div>
      </div>

      {/* License Section */}
      <div className="license-section">
        <h2>License and Rights</h2>
        <div className="license-grid">
          <div className="license-card">
            <h3>Perpetual License</h3>
            <p>Once purchased, use forever. No recurring fees for Lifetime plans.</p>
          </div>
          <div className="license-card">
            <h3>Source Code Access</h3>
            <p>Full source code included. Modify, extend, and customize.</p>
          </div>
          <div className="license-card">
            <h3>Trade Secrets</h3>
            <p>Access to revolutionary algorithms and proprietary technology.</p>
          </div>
          <div className="license-card">
            <h3>Commercial Rights</h3>
            <p>Use commercially, resell services, build products.</p>
          </div>
          <div className="license-card">
            <h3>White Label</h3>
            <p>Remove NexaStream branding, use your own.</p>
          </div>
          <div className="license-card">
            <h3>API Access</h3>
            <p>Unlimited API keys for your applications.</p>
          </div>
        </div>

        <div className="license-key-section">
          <h3>Generate License Key</h3>
          <p>Your license key is generated based on your connected wallet address.</p>
          {isConnected ? (
            <div className="license-key-box">
              <code className="license-key">
                NEXA-{address?.slice(2, 10).toUpperCase()}-LIFETIME
              </code>
              <button onClick={copyLicenseKey} className="copy-btn">
                {copied ? 'Copied!' : 'Copy Key'}
              </button>
            </div>
          ) : (
            <p className="connect-prompt">Connect your wallet to generate license key</p>
          )}
        </div>
      </div>

      {/* Payment Notice */}
      <div className="payment-notice">
        <p><strong>All payments are final and non-refundable</strong> due to the nature of digital goods and perpetual licenses.</p>
      </div>

      {/* FAQ */}
      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>What is included in the Lifetime plan?</h3>
            <p>Everything! Full source code, unlimited API access, trade secrets, white-label rights, and all future updates. You own it forever.</p>
          </div>
          <div className="faq-item">
            <h3>Can I use NexaStream commercially?</h3>
            <p>Yes! With any paid plan, you have full commercial rights. Build products, offer services, and monetize.</p>
          </div>
          <div className="faq-item">
            <h3>What are the API rate limits?</h3>
            <p>Monthly: 10K calls, Annual: 50K calls, Lifetime: UNLIMITED. Pay-per-use allows dynamic scaling.</p>
          </div>
          <div className="faq-item">
            <h3>Is there a free trial?</h3>
            <p>The Free tier provides 100 API calls/day forever. Upgrade anytime for more.</p>
          </div>
          <div className="faq-item">
            <h3>Can I get a refund?</h3>
            <p>Due to the nature of digital goods with perpetual licenses, all payments are final.</p>
          </div>
          <div className="faq-item">
            <h3>What blockchains are supported?</h3>
            <p>Celo, Ethereum, Base, Zora, Gnosis, Polygon zkEVM - all with near-zero gas fees!</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pricing-container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .pricing-header { text-align: center; margin-bottom: 3rem; }
        .pricing-header h1 { font-size: 3rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .license-badge { display: inline-flex; align-items: center; gap: 1rem; padding: 1rem 2rem; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 50px; color: white; margin-top: 1rem; }
        .billing-toggle { display: flex; justify-content: center; gap: 1rem; margin-bottom: 3rem; }
        .billing-toggle button { padding: 0.75rem 2rem; border: 2px solid #e0e0e0; background: white; border-radius: 25px; cursor: pointer; }
        .billing-toggle button.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-color: transparent; }
        .save-badge { background: #10b981; color: white; padding: 0.2rem 0.5rem; border-radius: 10px; font-size: 0.8rem; margin-left: 0.5rem; }
        .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 4rem; }
        .plan-card { background: white; border-radius: 20px; padding: 2rem; box-shadow: 0 10px 40px rgba(0,0,0,0.1); position: relative; }
        .plan-card.featured { border: 3px solid #f5576c; transform: scale(1.05); }
        .featured-badge { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 0.5rem 1.5rem; border-radius: 20px; font-weight: bold; font-size: 0.8rem; }
        .plan-header h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .plan-desc { color: #666; margin-bottom: 1rem; }
        .plan-price { text-align: center; margin: 1.5rem 0; }
        .price-amount { font-size: 3rem; font-weight: bold; }
        .price-unit { font-size: 1rem; color: #666; }
        .savings-note { background: #dcfce7; color: #166534; padding: 0.5rem; border-radius: 8px; text-align: center; font-weight: bold; }
        .plan-features { list-style: none; padding: 0; margin: 1.5rem 0; }
        .plan-features li { padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
        .plan-limits { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 10px; font-size: 0.9rem; }
        .plan-btn { width: 100%; padding: 1rem; border: none; border-radius: 10px; font-size: 1rem; font-weight: bold; cursor: pointer; }
        .plan-btn.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .plan-btn.cta { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .plan-btn.secondary { background: #e0e0e0; color: #333; }
        .usage-pricing { margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 10px; }
        .usage-pricing h4 { margin-bottom: 0.5rem; }
        .usage-pricing table { width: 100%; }
        .usage-pricing td { padding: 0.3rem 0; }
        .usage-pricing td:last-child { text-align: right; font-weight: bold; }
        .license-section, .faq-section { margin: 4rem 0; }
        .license-section h2, .faq-section h2 { text-align: center; font-size: 2.5rem; margin-bottom: 2rem; }
        .license-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .license-card { background: white; border-radius: 15px; padding: 1.5rem; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
        .license-card h3 { margin-bottom: 0.5rem; font-size: 1.1rem; }
        .license-card p { color: #666; font-size: 0.9rem; }
        .license-key-section { background: #f8f9fa; padding: 2rem; border-radius: 15px; margin-top: 2rem; text-align: center; }
        .license-key-box { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
        .license-key { background: #333; color: #0f0; padding: 1rem 2rem; border-radius: 10px; font-family: monospace; font-size: 1.2rem; }
        .copy-btn { padding: 1rem 2rem; background: #667eea; color: white; border: none; border-radius: 10px; cursor: pointer; }
        .payment-notice { background: #fef3c7; padding: 1.5rem; border-radius: 10px; text-align: center; margin: 2rem 0; }
        .faq-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .faq-item { background: white; padding: 1.5rem; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
        .faq-item h3 { color: #667eea; margin-bottom: 0.5rem; }
        .faq-item p { color: #666; }
        @media (max-width: 768px) {
          .plan-card.featured { transform: none; }
          .pricing-header h1 { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}
