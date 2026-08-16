// Test setup file
// Runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.error to reduce noise in tests
const originalError = console.error;
console.error = (...args) => {
  // Filter out expected errors
  const msg = args[0]?.toString() || '';
  if (msg.includes('Warning:') || msg.includes('ExperimentalWarning')) {
    return;
  }
  originalError.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
  await new Promise(resolve => setTimeout(resolve, 100));
});
