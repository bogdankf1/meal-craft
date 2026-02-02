"use client";

import { useState } from "react";
import { useGetProfilesQuery, Profile } from "@/lib/api/profiles-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, User } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfileSelectorProps {
  value: string | null; // null = "All Members"
  onChange: (profileId: string | null) => void;
  className?: string;
  showAllOption?: boolean;
  "data-spotlight"?: string;
}

export function ProfileSelector({
  value,
  onChange,
  className,
  showAllOption = true,
  "data-spotlight": dataSpotlight,
}: ProfileSelectorProps) {
  const t = useTranslations("profiles");
  const { data, isLoading } = useGetProfilesQuery();
  const [open, setOpen] = useState(false);

  const profiles = data?.profiles || [];

  const handleChange = (val: string) => {
    onChange(val === "all" ? null : val);
  };

  // Handle pointer down to close dropdown when clicking already-selected item
  const handleItemPointerDown = (val: string) => {
    const newValue = val === "all" ? null : val;
    if (newValue === value) {
      // Item is already selected, close dropdown
      setTimeout(() => setOpen(false), 0);
    }
  };

  return (
    <Select
      value={value ?? "all"}
      onValueChange={handleChange}
      disabled={isLoading}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger className={className} data-spotlight={dataSpotlight}>
        <SelectValue placeholder={t("selectProfile")}>
          <div className="flex items-center gap-2">
            {value === null || value === "all" ? (
              <>
                <Users className="h-4 w-4" />
                <span>{t("allMembers")}</span>
              </>
            ) : (
              <>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      profiles.find((p) => p.id === value)?.color || "#3B82F6",
                  }}
                />
                <span>{profiles.find((p) => p.id === value)?.name}</span>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem
            value="all"
            onPointerDown={() => handleItemPointerDown("all")}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{t("allMembers")}</span>
            </div>
          </SelectItem>
        )}
        {profiles.map((profile) => (
          <SelectItem
            key={profile.id}
            value={profile.id}
            onPointerDown={() => handleItemPointerDown(profile.id)}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: profile.color || "#3B82F6" }}
              />
              <span>{profile.name}</span>
              {profile.is_default && (
                <span className="text-xs text-muted-foreground">
                  ({t("default")})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
