"use client";

import { CategoryWithChannels } from "@/types/chat";

interface CategoryRailProps {
  categories: CategoryWithChannels[];
  activeCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
}

export default function CategoryRail({
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryRailProps) {
  return (
    <div className="w-16 bg-black flex flex-col items-center py-4 gap-2 border-r border-midnight-light">
      {categories.map((category) => {
        const isActive = category.id === activeCategoryId;
        const icon = category.icon || "📁";

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
              isActive
                ? "bg-accent text-black"
                : "bg-midnight hover:bg-midnight-light text-gray-400"
            }`}
            title={category.name}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
