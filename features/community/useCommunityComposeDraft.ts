import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

import type { PostCategory } from "./communityConstants";
import { toEmbeddedImageUri } from "./communityUtils";

export function useCommunityComposeDraft() {
  const [draftCategory, setDraftCategory] = useState<PostCategory>("공부 인증");
  const [draftGroupCode, setDraftGroupCode] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftImage, setDraftImage] = useState<string | null>(null);

  const changeCategory = useCallback((category: PostCategory) => {
    setDraftCategory(category);
    if (category !== "그룹 모집") setDraftGroupCode("");
  }, []);

  const changeGroupCode = useCallback((value: string) => {
    setDraftGroupCode(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6),
    );
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.45,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setDraftImage(asset.base64 ? toEmbeddedImageUri(asset.base64) : asset.uri);
    }
  }, []);

  const removeImage = useCallback(() => {
    setDraftImage(null);
  }, []);

  const resetDraft = useCallback(() => {
    setDraftTitle("");
    setDraftBody("");
    setDraftGroupCode("");
    setDraftImage(null);
    setDraftCategory("공부 인증");
  }, []);

  return {
    draftCategory,
    draftGroupCode,
    draftTitle,
    draftBody,
    draftImage,
    changeCategory,
    changeGroupCode,
    setDraftTitle,
    setDraftBody,
    pickImage,
    removeImage,
    resetDraft,
  };
}
