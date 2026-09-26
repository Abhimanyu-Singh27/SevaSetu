"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BadgeCheck, FileCheck2, LoaderCircle, ShieldCheck, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

type Verification = { status: string; submittedAt: string | null; notes: string | null; documentSubmitted: boolean };

export function WorkerVerificationForm({ language = "en" }: { language?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const hindi = language === "hi";
  const [verification, setVerification] = useState<Verification | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v1/worker/verification", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load verification status");
        const result = await response.json();
        setVerification(result.data);
      })
      .catch(() => setError(hindi ? "सत्यापन स्थिति लोड नहीं हो सकी।" : "Unable to load verification status."));
  }, [hindi]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (!new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]).has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
        throw new Error(hindi ? "JPG, PNG, WebP या PDF फाइल 10 MB तक चुनें।" : "Choose a JPG, PNG, WebP, or PDF file up to 10 MB.");
      }
      const presignResponse = await fetch("/api/v1/worker/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "presign", fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      });
      const presignResult = await presignResponse.json().catch(() => ({}));
      if (!presignResponse.ok) throw new Error(presignResult.error || "Unable to start upload.");

      const upload = await fetch(presignResult.data.uploadUrl, { method: "PUT", headers: presignResult.data.headers, body: file });
      if (!upload.ok) throw new Error(hindi ? "दस्तावेज़ अपलोड नहीं हो सका। फिर कोशिश करें।" : "Document upload failed. Please try again.");

      const completeResponse = await fetch("/api/v1/worker/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", objectKey: presignResult.data.objectKey, contentType: file.type, sizeBytes: file.size }),
      });
      const completeResult = await completeResponse.json().catch(() => ({}));
      if (!completeResponse.ok) throw new Error(completeResult.error || "Unable to submit document.");
      setVerification({ status: "PENDING", submittedAt: completeResult.data.submittedAt, notes: null, documentSubmitted: true });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : hindi ? "दस्तावेज़ जमा नहीं हो सका।" : "Unable to submit document.");
    } finally {
      setBusy(false);
    }
  }

  const status = verification?.status || "NOT_VERIFIED";
  const statusLabel = status === "VERIFIED" ? (hindi ? "सत्यापित" : "Verified") : status === "PENDING" ? (hindi ? "समीक्षा लंबित" : "Pending review") : status === "REJECTED" ? (hindi ? "फिर से जमा करें" : "Resubmission needed") : (hindi ? "सत्यापित नहीं" : "Not verified");

  return <section className="worker-verification-panel" aria-labelledby="worker-verification-title">
    <header className="worker-verification-heading">
      <span className="workspace-row-icon"><ShieldCheck size={18} /></span>
      <div><h2 id="worker-verification-title">{hindi ? "पहचान सत्यापन" : "Identity verification"}</h2><p>{hindi ? "अपना सरकारी पहचान दस्तावेज़ निजी रूप से जमा करें।" : "Submit a government identity document privately for review."}</p></div>
      <span className={`verification-status status-${status.toLowerCase()}`}>{status === "VERIFIED" && <BadgeCheck size={14} />}{statusLabel}</span>
    </header>
    {status === "VERIFIED" ? <p className="worker-verification-note"><FileCheck2 size={17} /> {hindi ? "आपकी पहचान सत्यापित है और बैज सार्वजनिक प्रोफ़ाइल पर दिखता है।" : "Your identity is verified. The badge is visible on your public profile."}</p> : status === "PENDING" ? <p className="worker-verification-note">{hindi ? "दस्तावेज़ जमा हो गया है और समीक्षा की प्रतीक्षा में है। समीक्षा पूरी होने तक आपका प्रोफ़ाइल सत्यापित नहीं दिखेगा।" : "Your document is submitted and awaiting review. Your profile will not show as verified until review is approved."}</p> : <>
      {status === "REJECTED" && verification?.notes && <p className="verification-message error">{verification.notes}</p>}
      <form className="worker-verification-form" onSubmit={submit}>
        <label>{hindi ? "सरकारी पहचान प्रमाण" : "Government identity proof"}<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required disabled={busy} /><small>{hindi ? "JPG, PNG, WebP या PDF · अधिकतम 10 MB" : "JPG, PNG, WebP, or PDF · up to 10 MB"}</small></label>
        <p className="worker-verification-privacy">{hindi ? "दस्तावेज़ निजी संग्रहण में रखा जाएगा और केवल अधिकृत समीक्षक इसे देख सकते हैं।" : "The document is stored privately and can only be viewed by authorized reviewers."}</p>
        {error && <p className="verification-message error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={!file || busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={16} />}{status === "REJECTED" ? (hindi ? "नया दस्तावेज़ जमा करें" : "Submit a new document") : (hindi ? "समीक्षा के लिए जमा करें" : "Submit for review")}</button>
      </form>
    </>}
  </section>;
}