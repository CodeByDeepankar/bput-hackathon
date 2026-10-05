import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  supabase,
  requireUserRole,
  ensureTeacher,
} from "../../_utils/supabase";

export const runtime = "nodejs";

const BUCKET_NAME = "learning-videos";

async function ensureBucketExists() {
  if (!supabase) return;
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) return;
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 104857600, // 100MB
        allowedMimeTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"],
      });
    }
  } catch (err) {
    console.warn("[Storage] Failed to auto-initialize bucket:", err.message);
  }
}

export async function POST(request) {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await requireUserRole(userId);
    ensureTeacher(teacher);

    const schoolId = teacher.school_id || "global";
    const body = await request.json();
    const { fileName, fileType } = body || {};

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    await ensureBucketExists();

    const cleanFileName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${schoolId}/lessons/${Date.now()}_${cleanFileName}`;

    let signedUploadUrl = null;
    let publicUrl = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUploadUrl(storagePath);
        if (data?.signedUrl) {
          signedUploadUrl = data.signedUrl;
        } else if (error) {
          console.warn("[Storage] createSignedUploadUrl error:", error.message);
        }
      } catch (e) {
        console.warn("[Storage] Exception creating signed upload URL:", e.message);
      }

      const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
      publicUrl = pubData?.publicUrl || null;
    }

    return NextResponse.json({
      success: true,
      bucket: BUCKET_NAME,
      storagePath,
      signedUploadUrl,
      publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: error.statusCode || 500 }
    );
  }
}
