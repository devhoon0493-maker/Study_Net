import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { categories, type Category } from "../communityConstants";
import type { CommunityStyles } from "../communityStyles";

export function CategoryTabs({
  selectedCategory,
  onSelectCategory,
  s,
}: {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  s: CommunityStyles;
}) {
  return (
    <ScrollView
      horizontal
      style={s.tabScroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.tabBar}
    >
      {categories.map((category) => {
        const active = selectedCategory === category;

        return (
          <TouchableOpacity
            key={category}
            style={[s.tab, active && s.tabActive]}
            onPress={() => onSelectCategory(category)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, active && s.tabTextActive]}>{category}</Text>
            {active && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
