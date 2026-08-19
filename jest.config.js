module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: [
    "utils/**/*.{ts,tsx}",
    "features/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/*Types.ts",
    "!**/*Types.tsx",
    "!**/*Styles.ts",
    "!**/*Styles.tsx",
    "!**/*Theme.ts",
    "!**/*Theme.tsx",
    "!**/components/**",
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
