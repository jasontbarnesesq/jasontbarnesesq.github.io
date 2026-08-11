export const RAW_BUCKET = process.env.RAW_BUCKET || "workspace-uploads-raw";
export const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET || "workspace-wallpapers-processed";
export const PROCESSOR_URL = process.env.PROCESSOR_URL || "";

export const TARGET_WIDTH = 5120;
export const TARGET_HEIGHT = 2160;

export const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;
export const RAW_READ_URL_TTL_MS = 30 * 60 * 1000;
export const DOWNLOAD_URL_TTL_MS = 24 * 60 * 60 * 1000;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
