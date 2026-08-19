import { useEffect, useRef } from "react";

import { CODE_LENGTH } from "./groupConstants";

type UseInitialGroupCodeJoinParams = {
  initialCodeParam: string | string[] | undefined;
  memberReady: boolean;
  joining: boolean;
  setCodeError: (value: string) => void;
  setCodeInput: (value: string) => void;
  joinByCode: (code: string) => Promise<void>;
  onCodePending: () => void;
};

export function useInitialGroupCodeJoin({
  initialCodeParam,
  memberReady,
  joining,
  setCodeError,
  setCodeInput,
  joinByCode,
  onCodePending,
}: UseInitialGroupCodeJoinParams) {
  const pendingJoinCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const nextCode = Array.isArray(initialCodeParam)
      ? initialCodeParam[0]
      : initialCodeParam;
    const normalizedCode = (nextCode ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);

    if (normalizedCode.length !== CODE_LENGTH) return;

    onCodePending();
    setCodeError("");
    setCodeInput(normalizedCode);
    pendingJoinCodeRef.current = normalizedCode;
  }, [initialCodeParam, onCodePending, setCodeError, setCodeInput]);

  useEffect(() => {
    if (!memberReady || joining || !pendingJoinCodeRef.current) return;

    const pendingCode = pendingJoinCodeRef.current;
    pendingJoinCodeRef.current = null;
    void joinByCode(pendingCode);
  }, [joinByCode, joining, memberReady]);
}
