// Jest setup file for backend tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';
process.env.DB_DATABASE = ':memory:';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsole = console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Keep error and warn for debugging
    error: originalConsole.error,
    warn: originalConsole.warn,
    // Mock info and debug to reduce noise
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});