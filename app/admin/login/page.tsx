import { redirect } from "next/navigation";

import { getCurrentAdminUser } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const currentUser = await getCurrentAdminUser();
  if (currentUser) {
    redirect("/admin");
  }

  return (
    <main className="shell stack">
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <p className="eyebrow">Admin Console</p>
            <h1 className="display-title">Kelola event secara terpusat</h1>
            <p className="lede">
              Buat banyak event, pisahkan data per acara, dan kunci booking tamu lewat QR yang langsung menuju
              seat map sesi masing-masing.
            </p>
          </div>

          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
