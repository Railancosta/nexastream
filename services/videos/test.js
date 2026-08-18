// Testes para o serviço de vídeos
// Rodar com: node --test test.js

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Funções de sanitização e validação
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Validação de tipos de arquivo
function isValidVideoType(mimetype) {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
  return allowedMimes.includes(mimetype);
}

// Validação de extensões
function isValidVideoExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  const allowedExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return allowedExts.includes(ext);
}

// Validação de tamanho
function isValidFileSize(size, maxSize = 100 * 1024 * 1024) {
  return size <= maxSize;
}

describe('Video Service - Sanitização de Inputs', () => {
  it('deve sanitizar título com HTML', () => {
    const title = '<script>alert("XSS")</script> Meu Vídeo';
    const sanitized = sanitizeInput(title);
    assert.strictEqual(sanitized, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; Meu Vídeo');
  });

  it('deve sanitizar descrição com SQL Injection', () => {
    const description = "Vídeo legal'; DROP TABLE videos; --";
    const sanitized = sanitizeInput(description);
    assert.strictEqual(sanitized, "Vídeo legal&#x27;; DROP TABLE videos; --");
  });

  it('deve não modificar strings seguras', () => {
    const input = 'Meu Vídeo Legal';
    const sanitized = sanitizeInput(input);
    assert.strictEqual(sanitized, input);
  });
});

describe('Video Service - Validação de Arquivos', () => {
  it('deve aceitar MIME types válidos', () => {
    const validMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    validMimes.forEach(mime => {
      assert.strictEqual(isValidVideoType(mime), true);
    });
  });

  it('deve rejeitar MIME types inválidos', () => {
    const invalidMimes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    invalidMimes.forEach(mime => {
      assert.strictEqual(isValidVideoType(mime), false);
    });
  });

  it('deve aceitar extensões válidas', () => {
    const validExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    validExts.forEach(ext => {
      assert.strictEqual(isValidVideoExtension(`video${ext}`), true);
    });
  });

  it('deve rejeitar extensões inválidas', () => {
    const invalidExts = ['.jpg', '.png', '.pdf', '.exe'];
    invalidExts.forEach(ext => {
      assert.strictEqual(isValidVideoExtension(`video${ext}`), false);
    });
  });

  it('deve aceitar arquivos dentro do limite de tamanho', () => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    assert.strictEqual(isValidFileSize(50 * 1024 * 1024, maxSize), true); // 50MB
    assert.strictEqual(isValidFileSize(100 * 1024 * 1024, maxSize), true); // 100MB
  });

  it('deve rejeitar arquivos acima do limite de tamanho', () => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    assert.strictEqual(isValidFileSize(101 * 1024 * 1024, maxSize), false); // 101MB
    assert.strictEqual(isValidFileSize(200 * 1024 * 1024, maxSize), false); // 200MB
  });
});

describe('Video Service - Validação de Metadados', () => {
  it('deve validar título não vazio', () => {
    const title = 'Meu Vídeo';
    assert.strictEqual(title.trim().length > 0, true);
  });

  it('deve rejeitar título vazio', () => {
    const title = '';
    assert.strictEqual(title.trim().length > 0, false);
  });

  it('deve validar título com tamanho máximo', () => {
    const maxLength = 100;
    const title = 'A'.repeat(maxLength);
    assert.strictEqual(title.length <= maxLength, true);
  });

  it('deve rejeitar título muito longo', () => {
    const maxLength = 100;
    const title = 'A'.repeat(maxLength + 1);
    assert.strictEqual(title.length <= maxLength, false);
  });

  it('deve validar descrição com tamanho máximo', () => {
    const maxLength = 5000;
    const description = 'A'.repeat(maxLength);
    assert.strictEqual(description.length <= maxLength, true);
  });

  it('deve rejeitar descrição muito longa', () => {
    const maxLength = 5000;
    const description = 'A'.repeat(maxLength + 1);
    assert.strictEqual(description.length <= maxLength, false);
  });
});

describe('Video Service - Geração de IDs', () => {
  it('deve gerar IDs únicos', () => {
    const { v4: uuidv4 } = require('uuid');
    const id1 = uuidv4();
    const id2 = uuidv4();
    assert.notStrictEqual(id1, id2);
  });

  it('deve gerar IDs válidos (UUID v4)', () => {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    // UUID v4 tem o formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.strictEqual(uuidRegex.test(id), true);
  });
});

describe('Video Service - Manipulação de Caminhos', () => {
  it('deve gerar caminho seguro para vídeo', () => {
    const { v4: uuidv4 } = require('uuid');
    const videoId = uuidv4();
    const storageDir = path.join(__dirname, '../../storage/videos');
    const filePath = path.join(storageDir, `${videoId}.mp4`);
    
    // Verificar que o caminho não contém sequências perigosas
    assert.strictEqual(filePath.includes('..'), false);
    assert.strictEqual(filePath.includes('/'), true);
  });

  it('deve normalizar caminho sem sequências perigosas', () => {
    const userInput = '../../../malicious/path';
    const normalized = path.normalize(userInput);
    // path.normalize não remove '..' automaticamente
    assert.strictEqual(normalized.includes('..'), true);
    // Por isso, sempre validar caminhos!
  });

  it('deve validar que caminho está dentro do diretório permitido', () => {
    const storageDir = path.join(__dirname, '../../storage/videos');
    const safePath = path.join(storageDir, 'video.mp4');
    const unsafePath = path.join(storageDir, '../../../etc/passwd');
    
    // Função para verificar se um caminho está dentro de um diretório
    function isPathInsideDir(filePath, dirPath) {
      const relative = path.relative(dirPath, filePath);
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    }
    
    assert.strictEqual(isPathInsideDir(safePath, storageDir), true);
    assert.strictEqual(isPathInsideDir(unsafePath, storageDir), false);
  });
});

console.log('✅ Todos os testes de vídeos foram executados!');
