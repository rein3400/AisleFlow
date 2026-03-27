"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="stack" style={{ alignItems: "flex-end" }}>
      <button
        className="button-ghost"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            setMessage("");

            const response = await fetch("/api/admin/logout", {
              method: "POST",
            });

            if (!response.ok) {
              const payload = (await response.json()) as { error?: string };
              setMessage(payload.error ?? "Logout gagal.");
              return;
            }

            router.push("/admin/login");
            router.refresh();
          });
        }}
        type="button"
      >
        {isPending ? "Keluar..." : "Logout"}
      </button>
      {message ? <span className="small muted">{message}</span> : null}
    </div>
  );
}
