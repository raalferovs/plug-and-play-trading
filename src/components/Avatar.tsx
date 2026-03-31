"use client";

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-lg",
};

export default function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const initials = name ? name.charAt(0).toUpperCase() : "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-accent flex items-center justify-center text-black font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
