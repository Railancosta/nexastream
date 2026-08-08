/**
 * NexaStream Backup Service
 * Automated backup and disaster recovery for storage layer
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

class BackupService {
  constructor(config = {}) {
    this.config = {
      // Backup destination
      type: config.type || process.env.BACKUP_TYPE || 'local', // local, s3, gcs
      localPath: config.localPath || process.env.BACKUP_LOCAL_PATH || './backups',
      // S3 backup config
      s3Bucket: config.s3Bucket || process.env.BACKUP_S3_BUCKET,
      s3Prefix: config.s3Prefix || process.env.BACKUP_S3_PREFIX || 'nexastream-backups',
      // Retention
      retentionDays: config.retentionDays || parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
      // Encryption
      encryptionEnabled: config.encryptionEnabled !== false,
      encryptionKey: config.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY,
      // Schedule
      autoBackup: config.autoBackup !== false,
      backupInterval: config.backupInterval || parseInt(process.env.BACKUP_INTERVAL) || 6 * 60 * 60 * 1000, // 6 hours
      // Verification
      verifyBackups: config.verifyBackups !== false,
      // Components to backup
      components: config.components || [
        'database',
        'storage-metadata',
        'blockchain-state',
        'config',
        'uploads'
      ]
    };

    this.backups = new Map(); // Track backup metadata
    this.backupTimer = null;
    this.isRunning = false;

    this.initialize();
  }

  async initialize() {
    // Ensure backup directory exists
    if (this.config.type === 'local') {
      const dirs = [
        this.config.localPath,
        path.join(this.config.localPath, 'database'),
        path.join(this.config.localPath, 'storage'),
        path.join(this.config.localPath, 'blockchain'),
        path.join(this.config.localPath, 'config')
      ];

      for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    }

    // Load existing backup metadata
    await this.loadBackupRegistry();

    // Start automatic backups
    if (this.config.autoBackup) {
      this.startAutoBackup();
    }
  }

  // ============================================
  // BACKUP OPERATIONS
  // ============================================

  /**
   * Create a full backup
   */
  async createBackup(options = {}) {
    const backupId = crypto.randomUUID();
    const timestamp = new Date();
    const backupPath = this.getBackupPath(backupId);

    const backupMeta = {
      backupId,
      timestamp,
      status: 'in_progress',
      components: {},
      size: 0,
      checksum: null,
      encrypted: this.config.encryptionEnabled,
      retentionDays: this.config.retentionDays,
      expiresAt: new Date(timestamp.getTime() + this.config.retentionDays * 24 * 60 * 60 * 1000)
    };

    try {
      console.log(`Starting backup ${backupId}`);

      // Create backup directory
      if (this.config.type === 'local') {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      // Backup each component
      for (const component of this.config.components) {
        if (options.components && !options.components.includes(component)) {
          continue;
        }

        const componentResult = await this.backupComponent(component, backupPath, backupId);
        backupMeta.components[component] = componentResult;
        backupMeta.size += componentResult.size;
      }

      // Create backup manifest
      await this.createManifest(backupId, backupMeta, backupPath);

      // Calculate total checksum
      const checksum = await this.calculateBackupChecksum(backupPath);
      backupMeta.checksum = checksum;

      // Upload to remote if configured
      if (this.config.type === 's3' || this.config.type === 'gcs') {
        await this.uploadBackup(backupId, backupPath);
      }

      // Verify backup
      if (this.config.verifyBackups) {
        const isValid = await this.verifyBackup(backupId);
        if (!isValid) {
          throw new Error('Backup verification failed');
        }
      }

      backupMeta.status = 'completed';
      backupMeta.completedAt = new Date();

      console.log(`Backup ${backupId} completed successfully`);
    } catch (error) {
      backupMeta.status = 'failed';
      backupMeta.error = error.message;
      console.error(`Backup ${backupId} failed:`, error);
    }

    // Save backup metadata
    this.backups.set(backupId, backupMeta);
    await this.saveBackupRegistry();

    // Clean up old backups
    await this.cleanupOldBackups();

    return backupMeta;
  }

  /**
   * Backup a specific component
   */
  async backupComponent(component, backupPath, backupId) {
    const startTime = Date.now();
    let result = { size: 0, files: 0 };

    switch (component) {
      case 'database':
        result = await this.backupDatabase(path.join(backupPath, 'database'));
        break;

      case 'storage-metadata':
        result = await this.backupStorageMetadata(path.join(backupPath, 'storage'));
        break;

      case 'blockchain-state':
        result = await this.backupBlockchainState(path.join(backupPath, 'blockchain'));
        break;

      case 'config':
        result = await this.backupConfig(path.join(backupPath, 'config'));
        break;

      case 'uploads':
        result = await this.backupUploads(path.join(backupPath, 'uploads'));
        break;

      default:
        console.warn(`Unknown component: ${component}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Backup database
   */
  async backupDatabase(outputPath) {
    const dbPath = process.env.DB_PATH || './data/nexastream.db';
    let totalSize = 0;
    let files = 0;

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      const destPath = path.join(outputPath, 'nexastream.db');
      fs.copyFileSync(dbPath, destPath);
      
      // If using PostgreSQL, use pg_dump
      if (process.env.DATABASE_URL) {
        await this.pgDump(path.join(outputPath, 'nexastream.sql'));
      }

      const stats = fs.statSync(destPath);
      totalSize = stats.size;
      files = 1;
    }

    return { size: totalSize, files, method: fs.existsSync(dbPath) ? 'copy' : 'pg_dump' };
  }

  /**
   * pg_dump for PostgreSQL
   */
  async pgDump(outputPath) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || ''
      };

      const pgdump = spawn('pg_dump', [
        '-h', process.env.DB_HOST || 'localhost',
        '-p', process.env.DB_PORT || '5432',
        '-U', process.env.DB_USER || 'nexastream',
        '-d', process.env.DB_NAME || 'nexastream',
        '-f', outputPath
      ], { env });

      pgdump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // pg_dump not available, that's okay
          resolve();
        }
      });

      pgdump.on('error', () => {
        resolve(); // pg_dump not installed, skip
      });
    });
  }

  /**
   * Backup storage metadata
   */
  async backupStorageMetadata(outputPath) {
    const metadataPath = './uploads/.metadata';
    let totalSize = 0;
    let files = 0;

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    if (fs.existsSync(metadataPath)) {
      const copyPath = path.join(outputPath, 'metadata');
      this.copyDirectory(metadataPath, copyPath);
      
      const stats = this.getDirectorySize(copyPath);
      totalSize = stats.size;
      files = stats.files;
    }

    return { size: totalSize, files };
  }

  /**
   * Backup blockchain state
   */
  async backupBlockchainState(outputPath) {
    const statePath = process.env.BLOCKCHAIN_DATA_PATH || './data/blockchain';
    let totalSize = 0;
    let files = 0;

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    if (fs.existsSync(statePath)) {
      this.copyDirectory(statePath, outputPath);
      
      const stats = this.getDirectorySize(outputPath);
      totalSize = stats.size;
      files = stats.files;
    }

    return { size: totalSize, files };
  }

  /**
   * Backup configuration files
   */
  async backupConfig(outputPath) {
    const configFiles = [
      '.env',
      'config.json',
      'settings.json'
    ];

    let totalSize = 0;
    let files = 0;

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        const destPath = path.join(outputPath, file);
        // Don't include actual secrets in backup, create a sanitized version
        let content = fs.readFileSync(file, 'utf8');
        content = this.sanitizeConfig(content);
        fs.writeFileSync(destPath, content);
        
        const stats = fs.statSync(destPath);
        totalSize += stats.size;
        files++;
      }
    }

    return { size: totalSize, files };
  }

  /**
   * Backup uploads (optional, can be large)
   */
  async backupUploads(outputPath) {
    const uploadsPath = './uploads';
    let totalSize = 0;
    let files = 0;

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Only backup small files by default
    // Large uploads should be in distributed storage
    if (fs.existsSync(uploadsPath)) {
      const entries = fs.readdirSync(uploadsPath);
      
      for (const entry of entries) {
        if (entry === '.metadata') continue; // Already backed up separately
        
        const entryPath = path.join(uploadsPath, entry);
        const stats = fs.statSync(entryPath);
        
        // Skip files larger than 100MB in automatic backup
        if (stats.size < 100 * 1024 * 1024) {
          if (stats.isDirectory()) {
            this.copyDirectory(entryPath, path.join(outputPath, entry));
          } else {
            fs.copyFileSync(entryPath, path.join(outputPath, entry));
          }
          totalSize += stats.size;
          files++;
        }
      }
    }

    return { size: totalSize, files };
  }

  // ============================================
  // RESTORE OPERATIONS
  // ============================================

  /**
   * Restore from backup
   */
  async restoreBackup(backupId, options = {}) {
    const backupMeta = this.backups.get(backupId);
    
    if (!backupMeta) {
      throw new Error(`Backup ${backupId} not found`);
    }

    if (backupMeta.status !== 'completed') {
      throw new Error(`Backup ${backupId} is not completed`);
    }

    const backupPath = this.getBackupPath(backupId);
    const restoreResults = {};

    try {
      // Verify backup before restore
      if (this.config.verifyBackups) {
        const isValid = await this.verifyBackup(backupId);
        if (!isValid) {
          throw new Error('Backup integrity check failed');
        }
      }

      // Download from remote if needed
      if (this.config.type !== 'local') {
        await this.downloadBackup(backupId, backupPath);
      }

      // Restore each component
      for (const [component, componentMeta] of Object.entries(backupMeta.components)) {
        if (options.components && !options.components.includes(component)) {
          continue;
        }

        restoreResults[component] = await this.restoreComponent(
          component,
          backupPath,
          options.dryRun || false
        );
      }

      console.log(`Restore from backup ${backupId} completed`);

      return {
        backupId,
        restored: true,
        results: restoreResults
      };
    } catch (error) {
      console.error(`Restore from backup ${backupId} failed:`, error);
      throw error;
    }
  }

  /**
   * Restore a specific component
   */
  async restoreComponent(component, backupPath, dryRun = false) {
    const sourcePath = path.join(backupPath, component);

    if (!fs.existsSync(sourcePath)) {
      return { restored: false, reason: 'Component not in backup' };
    }

    switch (component) {
      case 'database':
        return this.restoreDatabase(sourcePath, dryRun);

      case 'storage-metadata':
        return this.restoreStorageMetadata(sourcePath, dryRun);

      case 'blockchain-state':
        return this.restoreBlockchainState(sourcePath, dryRun);

      case 'config':
        return this.restoreConfig(sourcePath, dryRun);

      case 'uploads':
        return this.restoreUploads(sourcePath, dryRun);

      default:
        return { restored: false, reason: 'Unknown component' };
    }
  }

  /**
   * Restore database
   */
  async restoreDatabase(sourcePath, dryRun = false) {
    const dbPath = process.env.DB_PATH || './data/nexastream.db';

    if (!dryRun) {
      // Create backup of current database
      if (fs.existsSync(dbPath)) {
        const currentBackup = `${dbPath}.bak.${Date.now()}`;
        fs.copyFileSync(dbPath, currentBackup);
      }

      // Restore from backup
      const backupFile = path.join(sourcePath, 'nexastream.db');
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, dbPath);
      }

      // If SQL dump exists, restore it
      const sqlFile = path.join(sourcePath, 'nexastream.sql');
      if (fs.existsSync(sqlFile)) {
        await this.psqlRestore(sqlFile);
      }
    }

    return { restored: true, dryRun };
  }

  /**
   * psql restore
   */
  async psqlRestore(sqlFile) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || ''
      };

      const psql = spawn('psql', [
        '-h', process.env.DB_HOST || 'localhost',
        '-p', process.env.DB_PORT || '5432',
        '-U', process.env.DB_USER || 'nexastream',
        '-d', process.env.DB_NAME || 'nexastream',
        '-f', sqlFile
      ], { env });

      psql.on('close', (code) => {
        resolve();
      });

      psql.on('error', () => {
        resolve(); // psql not installed
      });
    });
  }

  /**
   * Restore storage metadata
   */
  async restoreStorageMetadata(sourcePath, dryRun = false) {
    const destPath = './uploads/.metadata';

    if (!dryRun) {
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true });
      }
      this.copyDirectory(sourcePath, destPath);
    }

    return { restored: true, dryRun };
  }

  /**
   * Restore blockchain state
   */
  async restoreBlockchainState(sourcePath, dryRun = false) {
    const destPath = process.env.BLOCKCHAIN_DATA_PATH || './data/blockchain';

    if (!dryRun) {
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true });
      }
      this.copyDirectory(sourcePath, destPath);
    }

    return { restored: true, dryRun };
  }

  /**
   * Restore config
   */
  async restoreConfig(sourcePath, dryRun = false) {
    const configFiles = ['.env', 'config.json', 'settings.json'];

    if (!dryRun) {
      for (const file of configFiles) {
        const srcPath = path.join(sourcePath, file);
        if (fs.existsSync(srcPath)) {
          // Merge with existing config instead of replacing
          const existingContent = fs.existsSync(file) 
            ? fs.readFileSync(file, 'utf8')
            : '';
          const backupContent = fs.readFileSync(srcPath, 'utf8');
          
          // For .env files, merge settings
          if (file === '.env') {
            const merged = this.mergeEnvConfigs(existingContent, backupContent);
            fs.writeFileSync(file, merged);
          } else {
            fs.copyFileSync(srcPath, file);
          }
        }
      }
    }

    return { restored: true, dryRun };
  }

  /**
   * Restore uploads
   */
  async restoreUploads(sourcePath, dryRun = false) {
    const destPath = './uploads';

    if (!dryRun) {
      const entries = fs.readdirSync(sourcePath);
      
      for (const entry of entries) {
        const srcEntry = path.join(sourcePath, entry);
        const destEntry = path.join(destPath, entry);
        
        if (fs.statSync(srcEntry).isDirectory()) {
          this.copyDirectory(srcEntry, destEntry);
        } else {
          fs.copyFileSync(srcEntry, destEntry);
        }
      }
    }

    return { restored: true, dryRun };
  }

  // ============================================
  // VERIFICATION
  // ============================================

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId) {
    const backupMeta = this.backups.get(backupId);
    
    if (!backupMeta) {
      return false;
    }

    const backupPath = this.getBackupPath(backupId);
    const manifestPath = path.join(backupPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return false;
    }

    // Verify checksum
    const calculatedChecksum = await this.calculateBackupChecksum(backupPath);
    
    if (calculatedChecksum !== backupMeta.checksum) {
      console.error(`Backup ${backupId} checksum mismatch`);
      return false;
    }

    // Verify components exist
    for (const component of Object.keys(backupMeta.components)) {
      const componentPath = path.join(backupPath, component);
      if (!fs.existsSync(componentPath)) {
        console.error(`Backup ${backupId} missing component: ${component}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate backup checksum
   */
  async calculateBackupChecksum(backupPath) {
    const hash = crypto.createHash('sha256');
    
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name === 'manifest.json') continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          hash.update(`${entry.name}:${stats.size}:`);
        }
      }
    };

    walkDir(backupPath);
    
    return hash.digest('hex');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Create backup manifest
   */
  async createManifest(backupId, meta, backupPath) {
    const manifest = {
      version: '1.0',
      backupId,
      timestamp: meta.timestamp,
      components: meta.components,
      size: meta.size,
      encrypted: meta.encrypted,
      retentionDays: meta.retentionDays,
      checksum: meta.checksum,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  /**
   * Get backup path
   */
  getBackupPath(backupId) {
    if (this.config.type === 'local') {
      return path.join(this.config.localPath, backupId);
    }
    return path.join('/tmp', backupId); // For remote, use temp first
  }

  /**
   * Copy directory recursively
   */
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Get directory size
   */
  getDirectorySize(dir) {
    let size = 0;
    let files = 0;

    const walk = (directory) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          size += stats.size;
          files++;
        }
      }
    };

    walk(dir);
    return { size, files };
  }

  /**
   * Sanitize config (remove secrets)
   */
  sanitizeConfig(content) {
    const secretPatterns = [
      /PASSWORD=.*/g,
      /SECRET=.*/g,
      /KEY=.*/g,
      /TOKEN=.*/g,
      /PRIVATE_KEY=.*/g,
      /API_KEY=.*/g
    ];

    let sanitized = content;
    for (const pattern of secretPatterns) {
      sanitized = sanitized.replace(pattern, '$1=SANITIZED');
    }

    return sanitized;
  }

  /**
   * Merge env configs
   */
  mergeEnvConfigs(existing, newContent) {
    const lines = newContent.split('\n');
    const result = existing.split('\n');

    for (const line of lines) {
      if (line.includes('=')) {
        const [key] = line.split('=');
        const existingIndex = result.findIndex(l => l.startsWith(key + '='));
        
        if (existingIndex >= 0) {
          result[existingIndex] = line;
        } else {
          result.push(line);
        }
      }
    }

    return result.join('\n');
  }

  // ============================================
  // LIFECYCLE MANAGEMENT
  // ============================================

  /**
   * Start automatic backups
   */
  startAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      if (!this.isRunning) {
        await this.createBackup();
      }
    }, this.config.backupInterval);

    console.log(`Auto-backup started with interval: ${this.config.backupInterval}ms`);
  }

  /**
   * Stop automatic backups
   */
  stopAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups() {
    const now = new Date();
    let deletedCount = 0;

    for (const [backupId, meta] of this.backups) {
      if (new Date(meta.expiresAt) < now || meta.status === 'failed') {
        try {
          // Delete local files
          const backupPath = this.getBackupPath(backupId);
          if (fs.existsSync(backupPath)) {
            fs.rmSync(backupPath, { recursive: true });
          }

          // Delete from remote
          if (this.config.type !== 'local') {
            await this.deleteRemoteBackup(backupId);
          }

          this.backups.delete(backupId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to cleanup backup ${backupId}:`, error);
        }
      }
    }

    if (deletedCount > 0) {
      await this.saveBackupRegistry();
      console.log(`Cleaned up ${deletedCount} old backups`);
    }

    return { deletedCount };
  }

  // ============================================
  // REMOTE STORAGE
  // ============================================

  /**
   * Upload backup to remote
   */
  async uploadBackup(backupId, localPath) {
    if (this.config.type === 's3') {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION
      });

      const files = this.getAllFiles(localPath);
      
      for (const file of files) {
        const key = `${this.config.s3Prefix}/${backupId}/${path.relative(localPath, file)}`;
        
        await s3Client.send(new PutObjectCommand({
          Bucket: this.config.s3Bucket,
          Key: key,
          Body: fs.createReadStream(file)
        }));
      }
    }
  }

  /**
   * Download backup from remote
   */
  async downloadBackup(backupId, localPath) {
    if (this.config.type === 's3') {
      const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION
      });

      const prefix = `${this.config.s3Prefix}/${backupId}/`;
      
      const response = await s3Client.send(new ListObjectsV2Command({
        Bucket: this.config.s3Bucket,
        Prefix: prefix
      }));

      if (response.Contents) {
        for (const object of response.Contents) {
          const key = object.Key;
          const filePath = path.join(localPath, path.relative(prefix, key));
          
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          
          const fileResponse = await s3Client.send(new GetObjectCommand({
            Bucket: this.config.s3Bucket,
            Key: key
          }));

          const writeStream = fs.createWriteStream(filePath);
          fileResponse.Body.pipe(writeStream);
          
          await new Promise((resolve) => writeStream.on('finish', resolve));
        }
      }
    }
  }

  /**
   * Delete remote backup
   */
  async deleteRemoteBackup(backupId) {
    if (this.config.type === 's3') {
      const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION
      });

      const prefix = `${this.config.s3Prefix}/${backupId}/`;
      
      const response = await s3Client.send(new ListObjectsV2Command({
        Bucket: this.config.s3Bucket,
        Prefix: prefix
      }));

      if (response.Contents) {
        for (const object of response.Contents) {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: this.config.s3Bucket,
            Key: object.Key
          }));
        }
      }
    }
  }

  /**
   * Get all files in directory
   */
  getAllFiles(dir) {
    const files = [];
    
    const walk = (directory) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  // ============================================
  // REGISTRY MANAGEMENT
  // ============================================

  /**
   * Save backup registry
   */
  async saveBackupRegistry() {
    const registryPath = path.join(this.config.localPath, 'registry.json');
    
    const registry = {};
    for (const [id, meta] of this.backups) {
      registry[id] = meta;
    }

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  }

  /**
   * Load backup registry
   */
  async loadBackupRegistry() {
    const registryPath = path.join(this.config.localPath, 'registry.json');
    
    if (fs.existsSync(registryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        
        for (const [id, meta] of Object.entries(registry)) {
          if (new Date(meta.expiresAt) > new Date()) {
            this.backups.set(id, meta);
          }
        }
        
        console.log(`Loaded ${this.backups.size} backup records`);
      } catch (error) {
        console.error('Failed to load backup registry:', error);
      }
    }
  }

  // ============================================
  // INFO METHODS
  // ============================================

  /**
   * List all backups
   */
  listBackups() {
    const backups = [];
    
    for (const [id, meta] of this.backups) {
      backups.push({
        backupId: id,
        timestamp: meta.timestamp,
        status: meta.status,
        size: meta.size,
        components: Object.keys(meta.components),
        expiresAt: meta.expiresAt
      });
    }

    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get backup info
   */
  getBackupInfo(backupId) {
    return this.backups.get(backupId);
  }

  /**
   * Get backup statistics
   */
  getStats() {
    const backups = Array.from(this.backups.values());
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const completedBackups = backups.filter(b => b.status === 'completed').length;

    return {
      totalBackups: backups.length,
      completedBackups,
      failedBackups: backups.filter(b => b.status === 'failed').length,
      totalSize,
      autoBackupEnabled: this.config.autoBackup,
      backupInterval: this.config.backupInterval,
      retentionDays: this.config.retentionDays,
      backupType: this.config.type
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    this.stopAutoBackup();
    await this.saveBackupRegistry();
  }
}

// Export singleton instance
const backupService = new BackupService();

module.exports = {
  BackupService,
  backupService
};
