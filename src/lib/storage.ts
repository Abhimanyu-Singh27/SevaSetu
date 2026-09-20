import { createHash, createHmac, randomUUID } from "node:crypto";

function env(name: string) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") throw new Error(`${name} is required in production`);
  return value || "";
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function keyPath(key: string) {
  return `/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function signingValues() {
  return { endpoint: env("S3_ENDPOINT").replace(/\/$/, ""), bucket: env("S3_BUCKET"), accessKey: env("S3_ACCESS_KEY_ID"), secretKey: env("S3_SECRET_ACCESS_KEY"), region: process.env.S3_REGION || "auto" };
}

export function createObjectKey(userId: string, fileName: string) {
  const extension = fileName.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] || "";
  return `uploads/${userId}/${randomUUID()}${extension}`;
}

export function presignObject(method: "PUT" | "HEAD", key: string, contentType?: string) {
  const values = signingValues();
  if (!values.endpoint || !values.bucket || !values.accessKey || !values.secretKey) throw new Error("Private object storage is not configured");
  const endpoint = new URL(values.endpoint);
  const host = endpoint.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const shortDate = amzDate.slice(0, 8);
  const credentialScope = `${shortDate}/${values.region}/s3/aws4_request`;
  const uri = `${endpoint.pathname.replace(/\/$/, "")}/${values.bucket}${keyPath(key)}`;
  const query = new URLSearchParams({ "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${values.accessKey}/${credentialScope}`, "X-Amz-Date": amzDate, "X-Amz-Expires": "900", "X-Amz-SignedHeaders": "host" });
  const canonicalQuery = [...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&");
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = `${method}\n${uri}\n${canonicalQuery}\n${canonicalHeaders}\nhost\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const dateKey = hmac(`AWS4${values.secretKey}`, shortDate);
  const regionKey = hmac(dateKey, values.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  query.set("X-Amz-Signature", createHmac("sha256", signingKey).update(stringToSign).digest("hex"));
  return { url: `${values.endpoint}/${values.bucket}${keyPath(key)}?${query.toString()}`, headers: contentType ? { "Content-Type": contentType } : {} };
}

export async function getObjectMetadata(key: string) {
  const signed = presignObject("HEAD", key);
  const response = await fetch(signed.url, { method: "HEAD", cache: "no-store" });
  if (!response.ok) return null;
  const contentLength = Number(response.headers.get("content-length"));
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "";
  if (!Number.isSafeInteger(contentLength) || contentLength < 1 || !contentType) return null;
  return { sizeBytes: contentLength, contentType };
}

export async function scanObject(key: string) {
  const scanner = process.env.UPLOAD_SCANNER_URL;
  if (!scanner) {
    if (process.env.NODE_ENV === "production") throw new Error("UPLOAD_SCANNER_URL is required in production");
    return true;
  }
  const response = await fetch(scanner, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objectKey: key }), cache: "no-store" });
  return response.ok;
}
