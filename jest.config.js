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
      branches: 95,
      functions: 98,
      lines: 98,
      statements: 98,
    },
  },
};
