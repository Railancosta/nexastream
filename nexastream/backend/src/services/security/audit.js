/**
 * NexaStream Security Audit Service
 * Automated security scanning and vulnerability assessment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Security Check Types
const CheckType = {
  SQL_INJECTION: 'sql_injection',
  XSS: 'xss',
  COMMAND_INJECTION: 'command_injection',
  PATH_TRAVERSAL: 'path_traversal',
  HARDCODED_SECRETS: 'hardcoded_secrets',
  WEAK_CRYPTO: 'weak_crypto',
  INSECURE_RANDOM: 'insecure_random',
  AUTH_BYPASS: 'auth_bypass',
  IDOR: 'idor',
  SSRF: 'ssrf'
};

// Severity Levels
const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Security patterns to scan for
const SecurityPatterns = {
  // Hardcoded secrets
  secrets: [
    /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    /api[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/gi,
    /secret\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    /token\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    /private[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/gi
  ],
  
  // SQL Injection patterns
  sqlInjection: [
    /\$\{.*\}/g,
    /\+.*['"].*SELECT.*['"]/g,
    /\+.*['"].*INSERT.*['"]/g,
    /['"].*OR.*['"]\s*=\s*['"]/g
  ],
  
  // XSS patterns
  xss: [
    /innerHTML\s*=/g,
    /document\.write\s*\(/g,
    /eval\s*\(\s*request/g
  ],
  
  // Command injection
  commandInjection: [
    /exec\s*\(\s*\$/g,
    /system\s*\(\s*\$/g,
    /shell_exec\s*\(\s*\$/g,
    /exec\s*\(`/g
  ],
  
  // Path traversal
  pathTraversal: [
    /\.\.\/.*/g,
    /readFile\s*\([^)]*\$/g,
    /readFileSync\s*\([^)]*\$/g
  ],
  
  // Weak crypto
  weakCrypto: [
    /md5/gi,
    /sha1/gi,
    /Math\.random\s*\(\s*\)/g
  ]
};

class SecurityReport {
  constructor() {
    this.findings = [];
    this.startTime = Date.now();
    this.endTime = null;
    this.scannedFiles = 0;
    this.linesScanned = 0;
  }

  addFinding(finding) {
    this.findings.push({
      id: this.findings.length + 1,
      timestamp: new Date().toISOString(),
      ...finding
    });
  }

  complete() {
    this.endTime = Date.now();
  }

  getDuration() {
    return (this.endTime || Date.now()) - this.startTime;
  }

  getSummary() {
    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    this.findings.forEach(f => {
      bySeverity[f.severity]++;
    });

    return {
      total: this.findings.length,
      bySeverity,
      duration: this.getDuration(),
      scannedFiles: this.scannedFiles,
      linesScanned: this.linesScanned,
      passed: bySeverity.critical === 0 && bySeverity.high === 0
    };
  }

  toJSON() {
    return {
      summary: this.getSummary(),
      findings: this.findings,
      timestamp: new Date().toISOString()
    };
  }
}

class SecurityAuditor {
  constructor() {
    this.excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    this.includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.go', '.sol'];
  }

  /**
   * Run complete security audit
   */
  async audit(sourcePath, options = {}) {
    const report = new SecurityReport();
    
    // Get all files to scan
    const files = this.getFiles(sourcePath);
    report.scannedFiles = files.length;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        report.linesScanned += content.split('\n').length;

        // Run all security checks
        this.scanForSecrets(file, content, report);
        this.scanForSQLInjection(file, content, report);
        this.scanForXSS(file, content, report);
        this.scanForCommandInjection(file, content, report);
        this.scanForPathTraversal(file, content, report);
        this.scanForWeakCrypto(file, content, report);
        this.scanForInsecureRandom(file, content, report);
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Check security configurations
    await this.checkSecurityConfig(sourcePath, report);

    report.complete();
    return report;
  }

  /**
   * Get all files in directory
   */
  getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!this.excludeDirs.includes(entry.name)) {
          this.getFiles(fullPath, files);
        }
      } else {
        const ext = path.extname(entry.name);
        if (this.includeExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Scan for hardcoded secrets
   */
  scanForSecrets(file, content, report) {
    for (const pattern of SecurityPatterns.secrets) {
      const matches = content.match(pattern);
      
      if (matches) {
        // Filter out obvious placeholders
        const realSecrets = matches.filter(m => 
          !m.includes('example') && 
          !m.includes('CHANGE') &&
          !m.includes('YOUR_') &&
          !m.includes('xxx') &&
          !m.includes('placeholder')
        );

        if (realSecrets.length > 0) {
          report.addFinding({
            type: CheckType.HARDCODED_SECRETS,
            severity: Severity.HIGH,
            file,
            message: `Potential hardcoded secret found`,
            detail: `Found ${realSecrets.length} potential secret(s)`,
            recommendation: 'Use environment variables or secure vault for secrets'
          });
        }
      }
    }
  }

  /**
   * Scan for SQL injection vulnerabilities
   */
  scanForSQLInjection(file, content, report) {
    for (const pattern of SecurityPatterns.sqlInjection) {
      if (pattern.test(content)) {
        report.addFinding({
          type: CheckType.SQL_INJECTION,
          severity: Severity.CRITICAL,
          file,
          message: 'Potential SQL injection vulnerability',
          recommendation: 'Use parameterized queries or ORM'
        });
        break;
      }
    }
  }

  /**
   * Scan for XSS vulnerabilities
   */
  scanForXSS(file, content, report) {
    for (const pattern of SecurityPatterns.xss) {
      if (pattern.test(content)) {
        report.addFinding({
          type: CheckType.XSS,
          severity: Severity.HIGH,
          file,
          message: 'Potential XSS vulnerability',
          recommendation: 'Sanitize user input, use textContent instead of innerHTML'
        });
        break;
      }
    }
  }

  /**
   * Scan for command injection
   */
  scanForCommandInjection(file, content, report) {
    for (const pattern of SecurityPatterns.commandInjection) {
      if (pattern.test(content)) {
        report.addFinding({
          type: CheckType.COMMAND_INJECTION,
          severity: Severity.CRITICAL,
          file,
          message: 'Potential command injection vulnerability',
          recommendation: 'Avoid shell commands with user input, use execFile'
        });
        break;
      }
    }
  }

  /**
   * Scan for path traversal
   */
  scanForPathTraversal(file, content, report) {
    for (const pattern of SecurityPatterns.pathTraversal) {
      if (pattern.test(content)) {
        report.addFinding({
          type: CheckType.PATH_TRAVERSAL,
          severity: Severity.HIGH,
          file,
          message: 'Potential path traversal vulnerability',
          recommendation: 'Validate and sanitize file paths, use path.resolve'
        });
        break;
      }
    }
  }

  /**
   * Scan for weak cryptography
   */
  scanForWeakCrypto(file, content, report) {
    const md5 = content.match(/md5/gi);
    const sha1 = content.match(/sha1/gi);

    if (md5) {
      report.addFinding({
        type: CheckType.WEAK_CRYPTO,
        severity: Severity.MEDIUM,
        file,
        message: 'MD5 usage detected - not secure for cryptographic purposes',
        recommendation: 'Use SHA-256 or stronger hash algorithms'
      });
    }

    if (sha1 && !content.includes('sha256')) {
      report.addFinding({
        type: CheckType.WEAK_CRYPTO,
        severity: Severity.LOW,
        file,
        message: 'SHA-1 usage detected',
        recommendation: 'SHA-1 is deprecated, consider SHA-256'
      });
    }
  }

  /**
   * Scan for insecure random
   */
  scanForInsecureRandom(file, content, report) {
    if (SecurityPatterns.weakCrypto[3].test(content)) {
      report.addFinding({
        type: CheckType.INSECURE_RANDOM,
        severity: Severity.MEDIUM,
        file,
        message: 'Math.random() usage for security purposes',
        recommendation: 'Use crypto.randomBytes() for cryptographic randomness'
      });
    }
  }

  /**
   * Check security configurations
   */
  async checkSecurityConfig(sourcePath, report) {
    // Check for .env files
    const envFiles = this.getFiles(sourcePath).filter(f => f.includes('.env'));
    
    if (envFiles.length > 0) {
      report.addFinding({
        type: CheckType.HARDCODED_SECRETS,
        severity: Severity.INFO,
        file: '.env files detected',
        message: 'Ensure .env files are in .gitignore',
        recommendation: 'Add .env to .gitignore before committing'
      });
    }

    // Check CORS configuration
    const corsFiles = this.getFiles(sourcePath).filter(f => 
      f.includes('cors') || f.includes('CORS')
    );
    
    if (corsFiles.length === 0) {
      report.addFinding({
        type: CheckType.AUTH_BYPASS,
        severity: Severity.MEDIUM,
        message: 'No CORS configuration found',
        recommendation: 'Configure CORS to restrict cross-origin requests'
      });
    }

    // Check for Helmet.js usage
    const helmetFiles = this.getFiles(sourcePath).filter(f => 
      f.includes('helmet')
    );
    
    if (helmetFiles.length === 0) {
      report.addFinding({
        type: CheckType.AUTH_BYPASS,
        severity: Severity.INFO,
        message: 'No security headers library detected',
        recommendation: 'Consider using Helmet.js for security headers'
      });
    }
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  const sourcePath = process.argv[2] || './src';
  
  console.log('🔒 NexaStream Security Audit');
  console.log('==============================');
  console.log(`Scanning: ${sourcePath}\n`);

  auditor.audit(sourcePath).then(report => {
    console.log('\n📊 Audit Summary:');
    console.log(`   Files Scanned: ${report.scannedFiles}`);
    console.log(`   Lines Scanned: ${report.linesScanned}`);
    console.log(`   Duration: ${report.getDuration()}ms\n`);

    const summary = report.getSummary();
    console.log('⚠️  Findings by Severity:');
    console.log(`   Critical: ${summary.bySeverity.critical}`);
    console.log(`   High: ${summary.bySeverity.high}`);
    console.log(`   Medium: ${summary.bySeverity.medium}`);
    console.log(`   Low: ${summary.bySeverity.low}`);
    console.log(`   Info: ${summary.bySeverity.info}\n`);

    if (summary.passed) {
      console.log('✅ Security audit PASSED - No critical or high vulnerabilities found');
    } else {
      console.log('❌ Security audit FAILED - Action required');
    }

    if (report.findings.length > 0) {
      console.log('\n📋 Top Findings:');
      report.findings.slice(0, 10).forEach(f => {
        console.log(`   [${f.severity.toUpperCase()}] ${f.message} (${path.basename(f.file || 'config')})`);
      });
    }

    // Write report to file
    const reportPath = path.join(sourcePath, 'security-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report.toJSON(), null, 2));
    console.log(`\n📄 Full report written to: ${reportPath}`);
  });
}

module.exports = {
  SecurityAuditor,
  SecurityReport,
  SecurityPatterns,
  CheckType,
  Severity
};
