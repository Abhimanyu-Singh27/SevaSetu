"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserDeleteButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function removeUser() {
    if (!window.confirm("Delete this account? It will be permanently deactivated and can no longer sign in.")) return;
    setLoading(true);
    const response = await fetch(`/api/v1/admin/users/${userId}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    setLoading(false);
  }

  return <button type="button" className="danger-button" onClick={removeUser} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15} /> : <><Trash2 size={15} /> Delete</>}</button>;
}
