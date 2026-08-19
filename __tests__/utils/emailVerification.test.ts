import {
  isPasswordProviderUser,
  requiresEmailVerification,
} from "../../utils/emailVerification";

const makeUser = (providerIds: string[], emailVerified: boolean) =>
  ({
    emailVerified,
    providerData: providerIds.map((providerId) => ({ providerId })),
  }) as never;

describe("email verification helpers", () => {
  it("detects password provider users", () => {
    expect(isPasswordProviderUser(null)).toBe(false);
    expect(isPasswordProviderUser(makeUser(["google.com"], true))).toBe(false);
    expect(isPasswordProviderUser(makeUser(["password"], true))).toBe(true);
  });

  it("requires verification only for unverified password users", () => {
    expect(requiresEmailVerification(null)).toBe(false);
    expect(requiresEmailVerification(makeUser(["password"], false))).toBe(true);
    expect(requiresEmailVerification(makeUser(["password"], true))).toBe(false);
    expect(requiresEmailVerification(makeUser(["google.com"], false))).toBe(
      false,
    );
  });
});
