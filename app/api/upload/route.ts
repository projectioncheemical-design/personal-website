import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Only ADMIN or MANAGER can upload images
  const role = (session.user as any)?.role as string | undefined;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Basic validations
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.byteLength > maxSize) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    const type = file.type || "";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    // Resize to max width 1000px, preserve aspect ratio, convert to webp
    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // If Cloudinary credentials exist, upload there; else save locally
    const hasCloudinary = !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));
    if (hasCloudinary) {
      try {
        const cloudinary = (await import("cloudinary")).v2;
        if (process.env.CLOUDINARY_URL) {
          cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
        } else {
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
            api_key: process.env.CLOUDINARY_API_KEY!,
            api_secret: process.env.CLOUDINARY_API_SECRET!,
          });
        }
        const uploaded = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: "projection-uploads", resource_type: "image", format: "webp", type: "upload" }, (err, result) => {
            if (err) reject(err); else resolve(result);
          });
          stream.end(processed);
        });
        return NextResponse.json({ url: uploaded.secure_url || uploaded.url }, { status: 201 });
      } catch (e) {
        console.error("Cloudinary upload failed, falling back to local", e);
        // fall through to local save
      }
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const orig = (file.name || "upload").replace(/[^a-zA-Z0-9_.-]+/g, "-");
    const base = path.basename(orig, path.extname(orig) || ".jpg").slice(0, 50);
    const stamp = Date.now().toString(36);
    const fname = `${base}-${stamp}.webp`;
    const outPath = path.join(uploadsDir, fname);
    await writeFile(outPath, processed);
    return NextResponse.json({ url: `/uploads/${fname}` }, { status: 201 });
  } catch (e) {
    console.error("/api/upload POST error", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
