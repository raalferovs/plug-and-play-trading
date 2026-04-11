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
    <div className="w-20 bg-black flex flex-col items-center py-4 gap-3 border-r border-midnight-light">
      {categories.map((category) => {
        const isActive = category.id === activeCategoryId;
        const icon = category.icon || "📁";

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className="flex flex-col items-center gap-1 group w-full px-1"
            title={category.name}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                isActive
                  ? "bg-accent text-black"
                  : "bg-midnight group-hover:bg-midnight-light text-gray-400"
              }`}
            >
              {icon}
            </div>
            <span
              className={`text-[10px] font-medium text-center leading-tight truncate w-full transition-colors ${
                isActive
                  ? "text-accent"
                  : "text-gray-500 group-hover:text-gray-300"
              }`}
            >
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
