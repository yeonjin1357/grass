"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UsernameForm() {
  const [value, setValue] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const u = value.trim();
        if (u) router.push(`/u/${encodeURIComponent(u)}`);
      }}
      style={{ display: "flex", gap: 8 }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="github username"
        aria-label="github username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #2a2f3a",
          background: "#0f1117",
          color: "inherit",
          fontSize: 16,
          minWidth: 220,
        }}
      />
      <button
        type="submit"
        style={{
          padding: "10px 18px",
          borderRadius: 8,
          border: "none",
          background: "#2ea043",
          color: "white",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        행성 만들기
      </button>
    </form>
  );
}
