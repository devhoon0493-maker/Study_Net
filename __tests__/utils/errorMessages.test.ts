import {
  getErrorCode,
  getErrorMessage,
  getFirebaseWriteErrorMessage,
  getGroupJoinErrorMessage,
} from "../../utils/errorMessages";

describe("error message helpers", () => {
  it("extracts error codes and messages safely", () => {
    expect(getErrorCode({ code: "auth/network-request-failed" })).toBe(
      "auth/network-request-failed",
    );
    expect(getErrorCode({ code: 123 })).toBe("123");
    expect(getErrorCode(null)).toBeUndefined();
    expect(getErrorCode("error")).toBeUndefined();

    expect(getErrorMessage(new Error("Boom"))).toBe("Boom");
    expect(getErrorMessage("Boom")).toBe("");
  });

  it("uses fallback text when no useful error message exists", () => {
    expect(getFirebaseWriteErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(getFirebaseWriteErrorMessage({}, "Fallback")).toBe("Fallback");
  });

  it("returns the original message for unknown errors with messages", () => {
    expect(
      getFirebaseWriteErrorMessage(new Error("Something failed"), "Fallback"),
    ).toBe("Something failed");
  });

  it("maps permission, network, and offline Firebase write failures", () => {
    expect(
      getFirebaseWriteErrorMessage({ code: "PERMISSION_DENIED" }, "Fallback"),
    ).not.toBe("Fallback");
    expect(
      getFirebaseWriteErrorMessage(
        { code: "auth/network-request-failed" },
        "Fallback",
      ),
    ).not.toBe("Fallback");
    expect(
      getFirebaseWriteErrorMessage(new Error("Client is offline"), "Fallback"),
    ).not.toBe("Fallback");
  });

  it("specializes group join permission errors", () => {
    const generic = getFirebaseWriteErrorMessage(
      { code: "PERMISSION_DENIED" },
      "Fallback",
    );
    const groupJoin = getGroupJoinErrorMessage({ code: "PERMISSION_DENIED" });

    expect(groupJoin).not.toBe("Fallback");
    expect(groupJoin).not.toBe(generic);
    expect(getGroupJoinErrorMessage(new Error("Other"))).toBe("Other");
  });
});
