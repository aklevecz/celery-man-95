import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { dev } from "$app/environment";

export async function GET() {
  console.log(Buffer);
  return new Response(
    JSON.stringify({
      success: true,
      message: "Auto-save API endpoint",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
/**
 * Auto-save API endpoint for local development
 * Automatically saves generated images to local filesystem
 * Only works when running in development mode
 */
export async function POST({ request }) {
  // Only work in development mode
  if (!dev) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Auto-save only available in development mode",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  try {
    const { imageUrl, prompt, metadata } = await request.json();
    console.log(`📁 Auto-saving image with URL: ${imageUrl}`);
    if (!imageUrl || !prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields: imageUrl and prompt",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create auto-saved-images directory if it doesn't exist
    const saveDir = join(process.cwd(), "auto-saved-images");
    console.log("📁 Auto-saved images directory:", saveDir);
    if (!existsSync(saveDir)) {
      await mkdir(saveDir, { recursive: true });
    }
    console.log("📁 Auto-saved images directory created");
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedPrompt = prompt
      .substring(0, 50)
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const baseFilename = `${timestamp}_${sanitizedPrompt}`;
    const imageFilename = `${baseFilename}.jpg`;
    const metadataFilename = `${baseFilename}.json`;

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    console.log(imageResponse);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Save image file
    const imagePath = join(saveDir, imageFilename);
    await writeFile(imagePath, imageBuffer);

    // Save metadata file
    const metadataContent = {
      prompt,
      timestamp: new Date().toISOString(),
      imageUrl,
      filename: imageFilename,
      metadata: metadata || {},
    };

    const metadataPath = join(saveDir, metadataFilename);
    await writeFile(metadataPath, JSON.stringify(metadataContent, null, 2));

    console.log(`📁 Auto-saved image: ${imageFilename}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Image saved successfully",
        filename: imageFilename,
        path: imagePath,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auto-save error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `Auto-save failed: ${error.message}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
