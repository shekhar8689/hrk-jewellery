module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  setupFilesAfterEnv: ['./tests/setup/perFile.js'],
  testTimeout: 30000,
}
