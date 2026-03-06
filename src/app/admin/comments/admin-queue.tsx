/**
 * AdminCommentQueue — Client Component
 *
 * The moderation queue + the kitten explosion of joy.
 *
 * When there are pending comments: 🎉🐱 EXPLOSION MODE 🐱🎉
 * When there are none: peaceful zen garden
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Block } from "@/lib/blocks/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedComment = Block & {
  _pageTitle: string;
  _pageId: string;
};

interface AdminCommentQueueProps {
  pendingComments: EnrichedComment[];
}

// ─── Kitten Explosion ─────────────────────────────────────────────────────────

const KITTENS = ["🐱", "🐈", "😺", "😸", "😻", "🐾", "🐈‍⬛", "😽", "😹", "🙀"];
const CELEBRATIONS = ["🎉", "🎊", "✨", "💫", "🌟", "⭐", "🥳", "🎆", "🎇", "💖"];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

function KittenExplosion({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      setShowBanner(false);
      return;
    }

    // Spawn particles
    const allEmoji = [...KITTENS, ...CELEBRATIONS];
    const spawned: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      emoji: allEmoji[Math.floor(Math.random() * allEmoji.length)],
      x: Math.random() * 100,
      y: -10 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 1.5 + 0.5,
      size: Math.random() * 24 + 16,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));
    setParticles(spawned);
    setShowBanner(true);

    // Animate
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            rotation: p.rotation + p.rotationSpeed,
            opacity: p.y > 80 ? Math.max(0, p.opacity - 0.02) : p.opacity,
          }))
          .filter((p) => p.opacity > 0 && p.y < 120),
      );
    }, 50);

    // Fade banner after a bit
    const bannerTimeout = setTimeout(() => setShowBanner(false), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(bannerTimeout);
    };
  }, [active]);

  if (!active && particles.length === 0) return null;

  return (
    <>
      {/* Particle layer */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute select-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size}px`,
              transform: `rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              transition: "none",
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Banner */}
      {showBanner && (
        <div className="fixed top-1/4 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 animate-bounce">
          <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-8 py-6 text-center text-white shadow-2xl">
            <div className="mb-2 text-4xl">🐱🎉🐱</div>
            <p className="text-2xl font-bold">SOMEONE LEFT A COMMENT!</p>
            <p className="mt-1 text-sm opacity-90">
              This is not a drill. A real human wrote words on your site.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Token Input ──────────────────────────────────────────────────────────────

function useAdminToken() {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) setToken(saved);
  }, []);

  const saveToken = useCallback((t: string) => {
    setToken(t);
    localStorage.setItem("admin_token", t);
  }, []);

  return { token, saveToken };
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export function AdminCommentQueue({ pendingComments }: AdminCommentQueueProps) {
  const [comments, setComments] = useState(pendingComments);
  const { token, saveToken } = useAdminToken();
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [explode, setExplode] = useState(false);

  // Trigger explosion on mount if there are pending comments
  useEffect(() => {
    if (pendingComments.length > 0) {
      setExplode(true);
      const timeout = setTimeout(() => setExplode(false), 6000);
      return () => clearTimeout(timeout);
    }
  }, [pendingComments.length]);

  function log(msg: string) {
    setActionLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev]);
  }

  async function handleApprove(id: string) {
    if (!token) {
      setError("Please enter your admin token first.");
      return;
    }
    setError(null);

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to approve");
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== id));
      log(`✅ Approved comment ${id}`);
    } catch {
      setError("Network error");
    }
  }

  async function handleDelete(id: string) {
    if (!token) {
      setError("Please enter your admin token first.");
      return;
    }
    setError(null);

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to delete");
        return;
      }

      setComments((prev) => prev.filter((c) => c.id !== id));
      log(`🗑️ Deleted comment ${id}`);
    } catch {
      setError("Network error");
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <KittenExplosion active={explode} />

      {/* Token input */}
      {!token && (
        <div className="bg-muted/50 space-y-2 rounded-lg p-4">
          <label className="text-sm font-medium">Admin Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your ADMIN_TOKEN"
              className="border-input bg-background placeholder:text-muted-foreground flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                saveToken(tokenInput);
                setTokenInput("");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
          </div>
          <p className="text-muted-foreground text-xs">
            Stored in localStorage. Never sent anywhere except your own API.
          </p>
        </div>
      )}

      {token && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">🔑 Token saved</span>
          <button
            onClick={() => {
              saveToken("");
              localStorage.removeItem("admin_token");
            }}
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Clear
          </button>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Stats */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{comments.length}</span>
        <span className="text-muted-foreground text-sm">
          {comments.length === 1 ? "comment" : "comments"} awaiting review
        </span>
        {comments.length > 0 && (
          <button
            onClick={() => setExplode(true)}
            className="text-xs ml-2"
            title="Replay celebration"
          >
            🎉
          </button>
        )}
      </div>

      {/* Empty state */}
      {comments.length === 0 && (
        <div className="text-muted-foreground space-y-3 rounded-lg border border-dashed py-12 text-center">
          <div className="text-4xl">🍃</div>
          <p className="text-sm">No pending comments. All is calm.</p>
          <p className="text-xs opacity-60">
            When someone comments, come back here for kittens.
          </p>
        </div>
      )}

      {/* Comment cards */}
      {comments.map((comment) => {
        const p = comment.props as Record<string, unknown>;
        return (
          <div
            key={comment.id}
            className="border-border rounded-lg border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
                  {((p.name as string) || "A")[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium">
                  {(p.name as string) || "Anonymous"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {p.timestamp
                    ? new Date(p.timestamp as string).toLocaleString()
                    : ""}
                </span>
              </div>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded-full px-2 py-0.5 text-xs font-medium">
                Pending
              </span>
            </div>

            <p className="text-sm whitespace-pre-wrap">
              {(p.text as string) || ""}
            </p>

            <div className="text-muted-foreground text-xs">
              On page: <span className="font-medium">{comment._pageTitle}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(comment.id)}
                disabled={!token}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleDelete(comment.id)}
                disabled={!token}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                ✕ Delete
              </button>
            </div>
          </div>
        );
      })}

      {/* Action log */}
      {actionLog.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Action Log
          </h4>
          {actionLog.map((entry, i) => (
            <p key={i} className="text-muted-foreground text-xs font-mono">
              {entry}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
