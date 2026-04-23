import { CloudAlert } from "lucide-react";

import { BugBoard } from "@/components/bug-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { getFirebaseEnvStatus } from "@/lib/firebase-env";

export default function HomePage() {
  const firebaseEnv = getFirebaseEnvStatus();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-white">
              BT
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">Bug Tracker</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {firebaseEnv.isConfigured ? (
          <BugBoard />
        ) : (
          <article className="panel mx-auto max-w-lg rounded-2xl p-8">
            <div className="flex items-center gap-3">
              <CloudAlert className="h-5 w-5 shrink-0 text-[var(--accent)]" />
              <h1 className="text-lg font-semibold">Firebase setup required</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Add the following keys to <code className="rounded bg-[var(--surface-strong)] px-1 py-0.5 font-mono text-xs">.env.local</code> and restart the dev server.
            </p>
            <ul className="mt-4 space-y-2">
              {firebaseEnv.missing.map((key) => (
                <li key={key} className="rounded-lg border border-dashed border-[var(--line)] px-4 py-2.5 font-mono text-xs text-[var(--muted)]">
                  {key}
                </li>
              ))}
            </ul>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] py-4">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 text-xs text-[var(--muted)] sm:px-6 lg:px-8">
          <span>Bug Tracker</span>
          <span>Firebase · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
