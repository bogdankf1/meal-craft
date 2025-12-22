"use client";

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
}

export function ProfileSelector({
  value,
  onChange,
  className,
  showAllOption = true,
}: ProfileSelectorProps) {
  const t = useTranslations("profiles");
  const { data, isLoading } = useGetProfilesQuery();

  const profiles = data?.profiles || [];

  const handleChange = (val: string) => {
    onChange(val === "all" ? null : val);
  };

  return (
    <Select
      value={value ?? "all"}
      onValueChange={handleChange}
      disabled={isLoading}
    >
      <SelectTrigger className={className}>
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
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{t("allMembers")}</span>
            </div>
          </SelectItem>
        )}
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
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
