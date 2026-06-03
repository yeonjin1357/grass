"use client";

import { useState, type CSSProperties } from "react";

const btn: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #2a3340",
  background: "#11151c",
  color: "#e8eaf0",
  fontSize: 14,
  cursor: "pointer",
};

export function ShareBar({ username }: { username: string }) {
  const [status, setStatus] = useState<string | null>(null);

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(null), 1600);
  };

  const downloadPng = () => {
    // preserveDrawingBuffer:true 라서 합성된(Bloom 포함) 마지막 프레임을 그대로 읽을 수 있다.
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      flash("캔버스를 찾지 못했어요");
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        flash("캡처 실패");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grass-${username}.png`;
      a.click();
      URL.revokeObjectURL(url);
      flash("PNG 저장됨");
    }, "image/png");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("링크 복사됨");
    } catch {
      flash("복사 실패");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        pointerEvents: "auto",
      }}
    >
      <button onClick={downloadPng} style={btn}>
        ⬇ PNG 저장
      </button>
      <button onClick={copyLink} style={btn}>
        🔗 링크 복사
      </button>
      {status && (
        <span style={{ fontSize: 12, opacity: 0.75 }}>{status}</span>
      )}
    </div>
  );
}
