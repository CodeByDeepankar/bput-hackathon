"use client";
import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { fetchUserRole } from "@/lib/users";
import { useSchoolContent } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@teacher/components/ui/card";
import { Input } from "@teacher/components/ui/input";
import { Textarea } from "@teacher/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@teacher/components/ui/select";
import { Button } from "@teacher/components/ui/button";
import { Badge } from "@teacher/components/ui/badge";
import { Loader2, PlusCircle, Pencil, Trash2, XCircle } from "lucide-react";

const CONTENT_TYPES = [
  { value: "article", label: "Article" },
  { value: "video", label: "YouTube Video" },
  { value: "material", label: "Study Material" },
];

function defaultFormState() {
  return {
    type: "article",
    title: "",
    description: "",
    url: "",
    body: "",
    tags: "",
  };
}

function parseTags(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function buildYoutubeEmbed(url) {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const youtubePatterns = [
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    ];
    for (const pattern of youtubePatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        const src = `https://www.youtube.com/embed/${videoId}`;
        return `<iframe width="100%" height="315" src="${src}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
    }
  } catch (error) {
    console.error("Failed to build YouTube embed", error);
  }
  return null;
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
}

function ContentManager() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [roleDoc, setRoleDoc] = useState(null);
  const [roleError, setRoleError] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [form, setForm] = useState(() => defaultFormState());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteState, setDeleteState] = useState({ id: null, loading: false, error: null });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      setRoleDoc(null);
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
        setRoleDoc(doc);
      })
      .catch((error) => {
        if (!active) return;
        setRoleDoc(null);
        setRoleError(error?.message || "Unable to load role");
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  const schoolId = roleDoc?.schoolId || roleDoc?.school_id || null;
  const role = typeof roleDoc === "string" ? roleDoc : roleDoc?.role;

  const {
    content,
    loading: contentLoading,
    error: contentError,
    createContent,
    updateContent,
    deleteContent,
  } = useSchoolContent(schoolId, { limit: 50 });

  const sortedContent = useMemo(() => {
    if (!Array.isArray(content)) return [];
    return [...content].sort((a, b) => {
      const aTs = new Date(a.createdAt || 0).getTime();
      const bTs = new Date(b.createdAt || 0).getTime();
      return bTs - aTs;
    });
  }, [content]);

  const totalsByType = useMemo(() => {
    return sortedContent.reduce(
      (acc, item) => {
        const key = item.type || "article";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );
  }, [sortedContent]);

  const selectOptions = useMemo(() => {
    const base = CONTENT_TYPES.map((item) => ({ ...item, disabled: false }));
    const existingTypes = new Set(sortedContent.map((item) => item.type).filter(Boolean));
    const extras = Array.from(existingTypes)
      .filter((type) => !base.some((option) => option.value === type))
      .map((type) => ({
        value: type,
        label: type === "quiz" ? "Quiz (legacy)" : type.charAt(0).toUpperCase() + type.slice(1),
        disabled: true,
      }));
    return [...base, ...extras];
  }, [sortedContent]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    if (!form.title.trim()) {
      setSubmitError("Title is required");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        url: form.url.trim() || null,
        body: form.body.trim() || null,
        tags: parseTags(form.tags),
      };
      if (form.type === "video") {
        const embed = buildYoutubeEmbed(form.url);
        if (!embed) {
          setSubmitError("Enter a valid YouTube link");
          setSubmitting(false);
          return;
        }
        payload.embedHtml = embed;
      }
      if (editingId) {
        await updateContent(editingId, { ...payload, updatedBy: user.id });
        setSuccessMessage("Content updated");
      } else {
        await createContent({ ...payload, createdBy: user.id });
        setSuccessMessage("Content shared with students");
      }
      setForm(defaultFormState());
      setEditingId(null);
    } catch (error) {
      setSubmitError(error?.message || "Unable to save content");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setForm({
      type: item.type || "article",
      title: item.title || "",
      description: item.description || "",
      url: item.url || "",
      body: item.body || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
    });
    setEditingId(item.id);
    setSubmitError(null);
    setSuccessMessage(null);
    setDeleteState({ id: null, loading: false, error: null });
  };

  const cancelEdit = () => {
    setForm(defaultFormState());
    setEditingId(null);
    setSubmitError(null);
    setSuccessMessage(null);
    setDeleteState({ id: null, loading: false, error: null });
  };

  const handleDelete = async (id) => {
    if (!user?.id || deleteState.loading) return;
    setDeleteState({ id, loading: true, error: null });
    try {
      await deleteContent(id, user.id);
      if (editingId === id) {
        cancelEdit();
      }
      setDeleteState({ id: null, loading: false, error: null });
    } catch (error) {
      setDeleteState({ id, loading: false, error: error?.message || "Unable to delete" });
    }
  };

  if (!isSignedIn) {
    return null;
  }

  if (roleLoading) {
    return <div className="max-w-6xl mx-auto text-white/90">Loading teacher profile...</div>;
  }

  if (roleError) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Unable to load teacher data</div>
          <div>{roleError}</div>
        </CardContent>
      </Card>
    );
  }

  if (!role || !["teacher", "admin"].includes(role)) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">Access Denied</div>
          <div>You need teacher or admin privileges to manage shared content.</div>
        </CardContent>
      </Card>
    );
  }

  if (!schoolId) {
    return (
      <Card className="max-w-xl mx-auto bg-white/95 border-slate-200">
        <CardContent className="p-6 text-center text-slate-700">
          <div className="text-lg font-semibold mb-2">School not linked</div>
          <div>Assign a school to this teacher account to share resources.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-white/90 font-semibold text-2xl mb-4">Share Learning Content</div>

      <Card className="bg-white/95 border-slate-200 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-900 text-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-violet-600" />
            Upload new resource
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content type</label>
                <Select value={form.type} onValueChange={(value) => handleChange("type", value)}>
                  <SelectTrigger className="bg-white border-slate-200 shadow-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-50">
                    {selectOptions.map((item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        disabled={item.disabled}
                        className="data-[highlighted]:bg-slate-100 data-[state=checked]:bg-violet-100"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                <Input
                  value={form.tags}
                  onChange={(event) => handleChange("tags", event.target.value)}
                  placeholder="STEM, Algebra, Revision"
                  className="bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <Input
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Enter a clear title"
                className="bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short description</label>
              <Textarea
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Explain how this resource helps the students"
                className="bg-white"
                rows={3}
              />
            </div>

            {(form.type === "article" || form.type === "material") && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Detailed notes</label>
                <Textarea
                  value={form.body}
                  onChange={(event) => handleChange("body", event.target.value)}
                  placeholder="Paste study notes or key takeaways"
                  className="bg-white"
                  rows={6}
                />
              </div>
            )}

            {(form.type === "material" || form.type === "video") && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {form.type === "video" ? "YouTube link" : "Resource link"}
                </label>
                <Input
                  value={form.url}
                  onChange={(event) => handleChange("url", event.target.value)}
                  placeholder={form.type === "video" ? "https://www.youtube.com/watch?v=..." : "https://example.com/resource"}
                  className="bg-white"
                />
              </div>
            )}

            {submitError && <div className="text-sm text-red-600">{submitError}</div>}
            {successMessage && <div className="text-sm text-emerald-600">{successMessage}</div>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : editingId ? (
                  "Update content"
                ) : (
                  "Share with students"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={editingId ? cancelEdit : () => {
                  setForm(defaultFormState());
                  setSubmitError(null);
                  setSuccessMessage(null);
                }}
              >
                {editingId ? "Cancel edit" : "Clear form"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white/95 border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-900 text-lg">Shared with your students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4 text-xs sm:text-sm text-slate-600">
            <div>Total items <span className="font-semibold text-slate-900">{sortedContent.length}</span></div>
            {CONTENT_TYPES.map((item) => (
              <div key={item.value}>
                {item.label} <span className="font-semibold text-slate-900">{totalsByType[item.value] || 0}</span>
              </div>
            ))}
            {totalsByType.quiz ? (
              <div key="quiz-legacy">
                Assessments <span className="font-semibold text-slate-900">{totalsByType.quiz}</span>
              </div>
            ) : null}
          </div>

          {contentError && (
            <div className="text-sm text-red-600 mb-4">{contentError}</div>
          )}

          {contentLoading && !sortedContent.length ? (
            <div className="py-10 text-center text-slate-500">Loading shared content...</div>
          ) : sortedContent.length ? (
            <div className="space-y-4">
              {sortedContent.map((item) => {
                const isDeleting = deleteState.loading && deleteState.id === item.id;
                const deleteError = deleteState.error && deleteState.id === item.id;
                return (
                  <Card key={item.id} className="border-slate-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 text-base">{item.title}</h3>
                            <Badge className="bg-violet-100 text-violet-700 border border-violet-200 uppercase">{item.type}</Badge>
                            {editingId === item.id && (
                              <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Editing</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{formatDate(item.createdAt)}</span>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                              <Pencil className="w-4 h-4 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="w-4 h-4 animate-spin" /> Deleting
                                </span>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-violet-700 hover:text-violet-800 underline"
                        >
                          Open resource
                        </a>
                      )}

                      {item.type === "video" && item.embedHtml && (
                        <div
                          className="rounded-lg overflow-hidden border border-slate-200"
                          dangerouslySetInnerHTML={{ __html: item.embedHtml }}
                        />
                      )}

                      {item.body && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                          {item.body}
                        </div>
                      )}

                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {item.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-slate-100 rounded-full border border-slate-200">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {deleteError && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                          <XCircle className="w-4 h-4" /> {deleteState.error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500">
              No shared content yet. Use the form above to upload articles, videos, or study materials.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ContentPage() {
  return (
    <>
      <SignedIn>
        <ContentManager />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
