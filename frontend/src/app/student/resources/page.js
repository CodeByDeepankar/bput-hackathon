"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { fetchUserRole } from "@/lib/users";
import { useSchoolContent } from "@/hooks/useApi";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent } from "@student/components/ui/card";
import { Badge } from "@student/components/ui/badge";
import { Button } from "@student/components/ui/button";
import { Input } from "@student/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import { RESOURCE_SECTION_ORDER, buildResourcePreview, extractYoutubeId, getResourceMeta, normalizeContentType } from "@student/utils/resourceHelpers";

function ResourceLibraryContent() {
  const { user, isLoaded } = useUser();
  const { theme = "dark" } = useTheme();
  const [schoolId, setSchoolId] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const formatContentDate = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return String(value);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setSchoolId(null);
      setRoleError(null);
      setRoleLoading(false);
      return;
    }
    let active = true;
    setRoleLoading(true);
    setRoleError(null);
    fetchUserRole(user.id)
      .then((doc) => {
        if (!active) return;
        const school = doc?.schoolId || doc?.school_id || null;
        setSchoolId(school);
        setRoleError(null);
      })
      .catch((error) => {
        if (!active) return;
        setSchoolId(null);
        setRoleError(error?.message || "Unable to load shared content");
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, user?.id]);

  const {
    content,
    loading: contentLoading,
    error: contentError,
  } = useSchoolContent(schoolId);

  const sortedContent = useMemo(() => {
    if (!Array.isArray(content)) return [];
    return [...content].sort((a, b) => {
      const aTs = new Date(a?.createdAt || 0).getTime();
      const bTs = new Date(b?.createdAt || 0).getTime();
      return bTs - aTs;
    });
  }, [content]);

  const groupedContent = useMemo(() => {
    if (!sortedContent.length) return [];
    const buckets = sortedContent.reduce((acc, item) => {
      const key = normalizeContentType(item?.type);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    return Object.entries(buckets)
      .map(([type, items]) => {
        const meta = getResourceMeta(type);
        return { ...meta, items };
      })
      .sort((a, b) => {
        const indexA = RESOURCE_SECTION_ORDER.indexOf(a.key);
        const indexB = RESOURCE_SECTION_ORDER.indexOf(b.key);
        const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
        const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
        if (safeA !== safeB) return safeA - safeB;
        return a.label.localeCompare(b.label);
      });
  }, [sortedContent]);

  const filterOptions = useMemo(() => {
    return [
      { key: "all", label: "All resources", count: sortedContent.length },
      ...groupedContent.map((section) => ({
        key: section.key,
        label: section.label,
        count: section.items.length,
      })),
    ];
  }, [sortedContent, groupedContent]);

  const filteredContent = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedContent.filter((item) => {
      const typeKey = normalizeContentType(item?.type);
      if (activeType !== "all" && typeKey !== activeType) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        item.title || "",
        item.description || "",
        item.body || "",
        Array.isArray(item.tags) ? item.tags.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedContent, activeType, searchTerm]);

  const activeFilterMeta = useMemo(() => {
    if (activeType === "all") {
      return { key: "all", label: "All resources" };
    }
    return getResourceMeta(activeType);
  }, [activeType]);

  const backgroundClass = theme === "dark" ? "dark" : "light";

  return (
    <div className={`min-h-screen pb-10 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 ${backgroundClass}`}>
      <div className="max-w-6xl mx-auto px-4 pt-8 space-y-6">
        <div className="space-y-2">
          <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200">
            School resources
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Shared Library
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Browse every article, video, and study pack your teachers have shared. Use filters to jump straight to the resources you need right now.
          </p>
        </div>

        {roleLoading ? (
          <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 text-slate-700 dark:text-slate-200 text-center">
              Loading your school resources...
            </CardContent>
          </Card>
        ) : roleError ? (
          <Card className="bg-white/90 dark:bg-slate-900/70 border-red-200 dark:border-red-800">
            <CardContent className="p-6 text-red-700 dark:text-red-300 text-center">
              {roleError}
            </CardContent>
          </Card>
        ) : !schoolId ? (
          <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 text-slate-700 dark:text-slate-200 text-center">
              Your account is not linked to a school yet. Ask your teacher to assign you to a class to see shared resources.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => {
                  const active = activeType === option.key;
                  const badgeClasses = active
                    ? "ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white/90"
                    : "ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200";
                  return (
                    <Button
                      key={option.key}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={
                        active
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      }
                      onClick={() => setActiveType(option.key)}
                    >
                      <span>{option.label}</span>
                      <span className={badgeClasses}>{option.count}</span>
                    </Button>
                  );
                })}
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by title or tag"
                  className="pl-9 bg-white/95 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>

            {contentError && (
              <Card className="bg-white/90 dark:bg-slate-900/70 border-red-200 dark:border-red-800">
                <CardContent className="p-4 text-sm text-red-700 dark:text-red-300">
                  {contentError}
                </CardContent>
              </Card>
            )}

            {contentLoading && !sortedContent.length ? (
              <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 text-center text-slate-600 dark:text-slate-300">
                  Loading resources...
                </CardContent>
              </Card>
            ) : filteredContent.length ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Showing {filteredContent.length} {filteredContent.length === 1 ? "resource" : "resources"} under {activeFilterMeta.label.toLowerCase()}.
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredContent.map((item) => {
                    const typeMeta = getResourceMeta(item?.type);
                    const youtubeId = extractYoutubeId(item?.url);
                    const preview = buildResourcePreview(item, 320);
                    const SectionIcon = typeMeta.icon;
                    return (
                      <Card key={item.id} className="border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70">
                        <CardContent className="p-4 space-y-3 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h2 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                                {item.title}
                              </h2>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {formatContentDate(item.createdAt)}
                              </div>
                            </div>
                            <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 flex items-center gap-1">
                              <SectionIcon className="w-3.5 h-3.5" />
                              {typeMeta.label}
                            </Badge>
                          </div>

                          {youtubeId ? (
                            <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                              <iframe
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                title={item.title}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : typeMeta.key === "video" && item?.embedHtml ? (
                            <div
                              className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                              dangerouslySetInnerHTML={{ __html: item.embedHtml }}
                            />
                          ) : null}

                          {preview && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-5">{preview}</p>
                          )}

                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-slate-100/80 dark:bg-slate-800/70 rounded-full border border-slate-200/80 dark:border-slate-700"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="self-start mt-auto border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-200"
                              asChild
                            >
                              <Link href={item.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open resource
                              </Link>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 text-center text-slate-600 dark:text-slate-300">
                  No resources match your filters yet. Try switching categories or clearing the search.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentResourcesPage() {
  return (
    <>
      <SignedIn>
        <ResourceLibraryContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
