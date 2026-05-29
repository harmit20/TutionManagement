import '@testing-library/jest-dom';

// Silence console.warn / console.error in tests unless explicitly needed
// Comment these out when debugging a failing test
// global.console.warn  = vi.fn();
// global.console.error = vi.fn();

// Mock firebase — we never want real FCM calls during tests
vi.mock('../services/firebase', () => ({
  registerPushToken: vi.fn().mockResolvedValue(null),
  revokePushToken:   vi.fn().mockResolvedValue(undefined),
  onForegroundMessage: vi.fn().mockReturnValue(() => {}),
}));

// vite-plugin-pwa virtual module
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
