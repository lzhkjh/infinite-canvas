import { useEffect, useState } from "react";
import type { MediaItem } from "~/src/infinite-canvas/types";

interface ArtworkDetailProps {
  artwork: MediaItem | null;
  onClose: () => void;
}

export function ArtworkDetail({ artwork, onClose }: ArtworkDetailProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.id = "artwork-detail-styles";
    styleEl.textContent = `
      @keyframes modalIn {
        from { opacity: 0; transform: scale(0.92) translateY(20px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .detail-card:hover {
        box-shadow: 0 20px 60px rgba(0,0,0,0.35) !important;
      }
      .detail-close:hover {
        background: #f0f0f0 !important;
        transform: rotate(90deg);
      }
      .detail-img { transition: transform 0.3s ease; }
      .detail-img:hover { transform: scale(1.02); }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    const existing = document.getElementById("artwork-detail-styles");
    if (existing) existing.remove();
    document.head.appendChild(styleEl);
    return () => {
      const el = document.getElementById("artwork-detail-styles");
      if (el) el.remove();
    };
  }, []);

  if (!artwork) return null;

  const title = artwork.title || "Untitled";
  const parts = title.split("|").map((s) => s.trim());
  const mainTitle = parts[0] || title;
  const subtitle = parts.length > 1 ? parts.slice(1).join(" | ") : "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        className="detail-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          overflow: "hidden",
          maxWidth: "820px",
          width: "92vw",
          maxHeight: "85vh",
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          animation: "modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          position: "relative",
        }}
      >
        <button
          className="detail-close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.9)",
            color: "#333",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          ¡Á
        </button>

        <div
          style={{
            flex: "0 0 45%",
            minHeight: "300px",
            background: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            position: "relative",
          }}
        >
          {!loaded && (
            <div style={{
              position: "absolute", inset: "24px",
              background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
              borderRadius: "12px",
            }} />
          )}
          <img
            className="detail-img"
            src={artwork.url}
            alt={mainTitle}
            onLoad={() => setLoaded(true)}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "420px",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.5s ease",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            padding: "28px 24px 24px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: "12px", color: "#999", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "4px" }}>
            DETAIL
          </div>

          {subtitle && (
            <h2 style={{
              fontSize: "16px",
              fontWeight: 400,
              color: "#333",
              margin: "0 0 4px",
              lineHeight: 1.5,
            }}>
              {subtitle}
            </h2>
          )}

          <h1 style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#222",
            margin: "0 0 20px",
            lineHeight: 1.3,
          }}>
            {mainTitle}
          </h1>

          <div style={{ height: "1px", background: "#eee", margin: "0 0 16px" }} />

          <div style={{ fontSize: "13px", lineHeight: 2, flex: 1 }}>
            <div style={{ padding: "2px 0" }}>
              <span style={{ color: "#999", marginRight: "8px" }}>TITLE</span>
              <span style={{ color: "#333" }}>{title}</span>
            </div>
            <div style={{ padding: "2px 0" }}>
              <span style={{ color: "#999", marginRight: "8px" }}>MEDIUM</span>
              <span style={{ color: "#333" }}>Digital</span>
            </div>
            <div style={{ padding: "2px 0" }}>
              <span style={{ color: "#999", marginRight: "8px" }}>ARTWORK DATE</span>
              <span style={{ color: "#333" }}>¡ª</span>
            </div>
            <div style={{ padding: "2px 0" }}>
              <span style={{ color: "#999", marginRight: "8px" }}>ADDED TO CANVAS</span>
              <span style={{ color: "#333" }}>¡ª</span>
            </div>
            <div style={{ padding: "2px 0" }}>
              <span style={{ color: "#999", marginRight: "8px" }}>NOTES</span>
              <span style={{ color: "#333" }}>¡ª</span>
            </div>
          </div>

          <div style={{ height: "1px", background: "#eee", margin: "12px 0" }} />

          <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.8 }}>
            <div style={{ padding: "2px 0" }}>
              <span style={{ color: "#999", marginRight: "8px" }}>³ß´ç</span>
              <span style={{ fontFamily: "monospace" }}>{artwork.width} ¡Á {artwork.height}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
