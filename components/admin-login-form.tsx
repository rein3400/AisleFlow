"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("superadmin@example.com");
  const [password, setPassword] = useState("superadmin123");
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setStatus({
          kind: "error",
          message: payload.error ?? "Login gagal.",
        });
        return;
      }

      setStatus({
        kind: "success",
        message: "Login berhasil. Mengarahkan ke dashboard...",
      });
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Admin Access</p>
        <h2 className="section-title">Masuk ke command center</h2>
        <p className="lede">
          Gunakan akun superadmin seed untuk membuat event pertama, lalu kelola event admin per acara.
        </p>
      </div>

      <div className="field">
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="superadmin@example.com"
          type="email"
          value={email}
        />
      </div>

      <div className="field">
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimal 8 karakter"
          type="password"
          value={password}
        />
      </div>

      {status ? <div className={`status ${status.kind}`}>{status.message}</div> : null}

      <button className="button" disabled={isPending} type="submit">
        {isPending ? "Memproses..." : "Masuk sebagai Admin"}
      </button>
    </form>
  );
}
