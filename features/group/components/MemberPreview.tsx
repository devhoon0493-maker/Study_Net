import { Image, Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { Member } from "../groupTypes";
import { getInitial, withAlpha } from "../groupUtils";

export function MemberPreview({ members, s }: { members: Member[]; s: GroupStyles }) {
  const preview = members.slice(0, 4);
  const hiddenCount = Math.max(0, members.length - preview.length);

  return (
    <View style={s.memberPreviewRow}>
      {preview.map((m, index) => (
        <View
          key={m.id}
          style={[
            s.memberPreviewAvatar,
            {
              marginLeft: index === 0 ? 0 : -8,
              backgroundColor: withAlpha(m.color, "18"),
              borderColor: withAlpha(m.color, "55"),
              zIndex: preview.length - index,
            },
          ]}
        >
          {m.image ? (
            <Image source={{ uri: m.image }} style={s.memberPreviewImage} />
          ) : (
            <Text style={[s.memberPreviewText, { color: m.color }]}>
              {getInitial(m.name)}
            </Text>
          )}
        </View>
      ))}
      {hiddenCount > 0 && (
        <View
          style={[
            s.memberPreviewAvatar,
            s.memberPreviewMore,
            { marginLeft: -8 },
          ]}
        >
          <Text style={s.memberPreviewMoreText}>+{hiddenCount}</Text>
        </View>
      )}
    </View>
  );
}
