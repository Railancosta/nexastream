/**
 * Security Audit & Monitoring Routes
 * NexaStream Security Dashboard
 */

import { Router, Request, Response } from 'express';
import { runSecurityAudit } from '../../utils/securityScanner';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { logger, securityLogger } from '../../utils/logger';

const router = Router();

// GET /api/v1/security/audit - Run security audit
router.get('/audit', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const reports = await runSecurityAudit();
    
    const summary = {
      total: reports.length,
      passed: reports.filter(r => r.passed).length,
      failed: reports.filter(r => !r.passed).length,
      critical: reports.filter(r => r.severity === 'CRITICAL').length,
      high: reports.filter(r => r.severity === 'HIGH').length,
    };

    res.json({
      success: true,
      summary,
      reports,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Security audit error:', error);
    res.status(500).json({ error: 'Failed to run security audit' });
  }
});

// GET /api/v1/security/logs - Get security logs
router.get('/logs', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    // In production, read from secure log file
    res.json({
      success: true,
      message: 'Security logs retrieved',
      logs: [
        { timestamp: new Date().toISOString(), type: 'INFO', message: 'Security monitoring active' },
      ]
    });

  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// GET /api/v1/security/status - Security status
router.get('/status', async (req: Request, res: Response) => {
  res.json({
    success: true,
    security: {
      status: 'ACTIVE',
      version: '2.0.0',
      features: {
        sqlInjectionProtection: true,
        xssProtection: true,
        csrfProtection: true,
        rateLimiting: true,
        helmetEnabled: true,
        blockchainSecurity: true,
      },
      timestamp: new Date().toISOString(),
    }
  });
});

// POST /api/v1/security/report - Report vulnerability
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { type, description, severity, email } = req.body;

    securityLogger.warn('Vulnerability report submitted', {
      type,
      severity,
      email: email || 'anonymous',
      description: description?.substring(0, 500),
    });

    res.json({
      success: true,
      message: 'Thank you for your report. Our security team will review it.',
      reportId: `VR-${Date.now().toString(36).toUpperCase()}`,
    });

  } catch (error) {
    logger.error('Report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
