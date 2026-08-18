// Testes para o serviço de autenticação
// Rodar com: node --test test.js

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import crypto from 'node:crypto';

// Mock do banco de dados (em memória)
const users = new Map();
const sessions = new Map();

// Funções de hash (mesmas do server.js)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

// Sanitização de inputs
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

describe('Auth Service - Funções de Hash', () => {
  it('deve gerar hash diferente para senhas diferentes', () => {
    const hash1 = hashPassword('senha123');
    const hash2 = hashPassword('senha456');
    assert.notStrictEqual(hash1, hash2);
  });

  it('deve verificar senha corretamente', () => {
    const password = 'minhaSenhaSegura123';
    const hash = hashPassword(password);
    assert.strictEqual(verifyPassword(password, hash), true);
  });

  it('deve rejeitar senha incorreta', () => {
    const password = 'minhaSenhaSegura123';
    const wrongPassword = 'senhaErrada';
    const hash = hashPassword(password);
    assert.strictEqual(verifyPassword(wrongPassword, hash), false);
  });

  it('deve gerar hashes únicos para a mesma senha (devido ao salt)', () => {
    const password = 'minhaSenhaSegura123';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    assert.notStrictEqual(hash1, hash2);
    // Mas ambos devem verificar corretamente
    assert.strictEqual(verifyPassword(password, hash1), true);
    assert.strictEqual(verifyPassword(password, hash2), true);
  });
});

describe('Auth Service - Sanitização de Inputs', () => {
  it('deve sanitizar tags HTML', () => {
    const input = '<script>alert("XSS")</script>';
    const sanitized = sanitizeInput(input);
    assert.strictEqual(sanitized, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('deve sanitizar aspas', () => {
    const input = '"teste"';
    const sanitized = sanitizeInput(input);
    assert.strictEqual(sanitized, '&quot;teste&quot;');
  });

  it('deve sanitizar apóstrofos', () => {
    const input = "teste'OR'1'='1";
    const sanitized = sanitizeInput(input);
    assert.strictEqual(sanitized, 'teste&#x27;OR&#x27;1&#x27;=&#x27;1');
  });

  it('deve não modificar strings seguras', () => {
    const input = 'usuario@exemplo.com';
    const sanitized = sanitizeInput(input);
    assert.strictEqual(sanitized, input);
  });

  it('deve retornar input não-string inalterado', () => {
    const input = 123;
    const sanitized = sanitizeInput(input);
    assert.strictEqual(sanitized, input);
  });
});

describe('Auth Service - Validação de Inputs', () => {
  it('deve validar email válido', () => {
    const email = 'usuario@exemplo.com';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.strictEqual(emailRegex.test(email), true);
  });

  it('deve rejeitar email inválido', () => {
    const invalidEmails = [
      'usuario@',
      '@exemplo.com',
      'usuario@.com',
      'usuario exemplo.com',
      ''
    ];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    invalidEmails.forEach(email => {
      assert.strictEqual(emailRegex.test(email), false);
    });
  });

  it('deve validar senha forte', () => {
    const strongPassword = 'SenhaForte123!';
    // Mínimo 8 caracteres, uma maiúscula, uma minúscula, um número, um especial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    assert.strictEqual(passwordRegex.test(strongPassword), true);
  });

  it('deve rejeitar senha fraca', () => {
    const weakPasswords = [
      '123456',
      'senha',
      'Senha123',
      'senha123',
      ''
    ];
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    weakPasswords.forEach(password => {
      assert.strictEqual(passwordRegex.test(password), false);
    });
  });
});

describe('Auth Service - JWT', () => {
  it('deve criar e verificar JWT', () => {
    const jwt = require('jsonwebtoken');
    const SECRET = 'test-secret-key-1234567890';
    const payload = { userId: '123', email: 'teste@exemplo.com' };
    
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, SECRET);
    
    assert.strictEqual(decoded.userId, payload.userId);
    assert.strictEqual(decoded.email, payload.email);
  });

  it('deve rejeitar JWT com segredo errado', () => {
    const jwt = require('jsonwebtoken');
    const SECRET = 'test-secret-key-1234567890';
    const WRONG_SECRET = 'wrong-secret';
    const payload = { userId: '123' };
    
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    
    try {
      jwt.verify(token, WRONG_SECRET);
      assert.fail('Deveria ter lançado erro');
    } catch (err) {
      assert.strictEqual(err.name, 'JsonWebTokenError');
    }
  });

  it('deve rejeitar JWT expirado', () => {
    const jwt = require('jsonwebtoken');
    const SECRET = 'test-secret-key-1234567890';
    const payload = { userId: '123' };
    
    const token = jwt.sign(payload, SECRET, { expiresIn: '0s' });
    
    // Esperar um pouco para garantir que o token expirou
    setTimeout(() => {
      try {
        jwt.verify(token, SECRET);
        assert.fail('Deveria ter lançado erro');
      } catch (err) {
        assert.strictEqual(err.name, 'TokenExpiredError');
      }
    }, 100);
  });
});

console.log('✅ Todos os testes de autenticação foram executados!');
