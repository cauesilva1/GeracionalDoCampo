"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Bug = {
  id: string;
  message: string;
  locale: string;
  path: string;
  userAgent: string;
  status: string;
  createdAt: string;
};

export function AdminPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = async () => {
    const res = await fetch("/api/admin/bugs");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = (await res.json()) as { bugs: Bug[] };
    setBugs(data.bugs ?? []);
    setAuthed(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const login = async () => {
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Senha incorreta.");
      return;
    }
    setPassword("");
    await load();
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setBugs([]);
    router.refresh();
  };

  const setStatus = async (id: string, status: "open" | "done") => {
    await fetch("/api/admin/bugs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  if (authed === null) {
    return (
      <p className="text-center font-sans text-sm text-white/50">Carregando…</p>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-arena-panel/80 p-6">
        <h1 className="font-display text-3xl uppercase text-white">Admin</h1>
        <p className="mt-2 font-sans text-sm text-white/50">
          Só você. Digite a senha de admin (não é a do banco).
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void login();
          }}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-sans text-sm text-white focus:border-arena-accent focus:outline-none"
          placeholder="Senha admin"
        />
        {error && (
          <p className="mt-2 font-sans text-sm text-arena-buzzer">{error}</p>
        )}
        <Button className="mt-4 w-full justify-center" onClick={() => void login()}>
          Entrar
        </Button>
      </div>
    );
  }

  const shown =
    filter === "open" ? bugs.filter((b) => b.status === "open") : bugs;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl uppercase text-white">Admin</h1>
          <p className="font-sans text-sm text-white/45">
            Bugs · {bugs.filter((b) => b.status === "open").length} abertos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "open" ? "primary" : "ghost"}
            onClick={() => setFilter("open")}
          >
            Abertos
          </Button>
          <Button
            variant={filter === "all" ? "primary" : "ghost"}
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button variant="outline" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </div>

      <ul className="mt-8 space-y-3">
        {shown.length === 0 && (
          <li className="rounded-xl border border-white/10 px-4 py-6 text-center text-sm text-white/40">
            Nenhum bug {filter === "open" ? "aberto" : ""}.
          </li>
        )}
        {shown.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-white/10 bg-arena-panel/60 px-4 py-3 text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-sans text-[10px] uppercase tracking-wider text-white/35">
                {new Date(b.createdAt).toLocaleString()} · {b.locale} ·{" "}
                <span
                  className={
                    b.status === "open"
                      ? "text-arena-buzzer"
                      : "text-emerald-400"
                  }
                >
                  {b.status}
                </span>
              </p>
              <div className="flex gap-2">
                {b.status === "open" ? (
                  <Button
                    variant="ghost"
                    className="text-[10px]"
                    onClick={() => void setStatus(b.id, "done")}
                  >
                    Marcar feito
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-[10px]"
                    onClick={() => void setStatus(b.id, "open")}
                  >
                    Reabrir
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap font-sans text-sm text-white/80">
              {b.message}
            </p>
            {b.path && (
              <p className="mt-2 truncate font-mono text-[10px] text-white/30">
                {b.path}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
