import { useState } from "react";

interface ArtworkInfo {
  title: string;
  artist: string;
  year: string;
  link: string;
  url: string;
  type: string;
  width: number;
  height: number;
}

interface ArtworkDetailProps {
  artwork: ArtworkInfo | null;
  onClose: () => void;
}

export function ArtworkDetail({ artwork, onClose }: ArtworkDetailProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!artwork) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .artwork-modal { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .artwork-modal:hover {
          transform: translateY(-2px);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .artwork-img-container img { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .artwork-img-container:hover img { transform: scale(1.02); }
        .artwork-close-btn { transition: all 0.2s ease; }
        .artwork-close-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: rotate(90deg);
        }
        .artwork-tag {
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(4px);
        }
        .artwork-info-row { transition: background 0.2s ease; }
        .artwork-info-row:hover { background: rgba(255, 255, 255, 0.05); }
        .artwork-link-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: all 0.3s ease;
        }
        .artwork-link-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .artwork-skeleton {
          background: linear-gradient(90deg, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <div
        className="artwork-modal"
        style={{
          background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderRadius: "20px",
          overflow: "hidden",
          maxWidth: "900px",
          width: "92vw",
          maxHeight: "88vh",
          display: "flex",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          color: "#e8e8e8",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="artwork-close-btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            background: "rgba(0, 0, 0, 0.3)",
            color: "#fff",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            backdropFilter: "blur(8px)",
          }}
        >
          ×
        </button>

        <div
          className="artwork-img-container"
          style={{
            flex: "0 0 48%",
            minHeight: "300px",
            backgroundColor: "#0a0a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {!imgLoaded && (
            <div
              className="artwork-skeleton"
              style={{ position: "absolute", inset: "24px", borderRadius: "12px" }}
            />
          )}
          <img
            src={artwork.url}
            alt={artwork.title}
            onLoad={() => setImgLoaded(true)}
            style={{
              maxWidth: "100%",
              maxHeight: "420px",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.5s ease",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            padding: "32px 28px 28px 28px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            minWidth: 0,
          }}
        >
          <div style={{ marginBottom: "6px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
              }}
            >
              {artwork.title || "Unknown Title"}
            </h2>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "#a0a0b8",
              margin: "0 0 20px 0",
              fontStyle: "italic",
            }}
          >
            {artwork.artist || "Unknown Artist"}
          </p>

          <div
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
              margin: "0 0 16px 0",
            }}
          />

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {artwork.year && (
              <span className="artwork-tag" style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#c8c8e0",
              }}>
                📅 {artwork.year}
              </span>
            )}
            {artwork.type && artwork.type !== "image" && (
              <span className="artwork-tag" style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#c8c8e0",
              }}>
                🎨 {artwork.type}
              </span>
            )}
            {artwork.width && artwork.height && (
              <span className="artwork-tag" style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                color: "#c8c8e0",
              }}>
                📐 {artwork.width}×{artwork.height}
              </span>
            )}
          </div>

          <div style={{ fontSize: "13px", color: "#8888a8", lineHeight: 2, flex: 1 }}>
            <div className="artwork-info-row" style={{ padding: "4px 8px", borderRadius: "6px", margin: "0 -8px" }}>
              <span style={{ color: "#666688", marginRight: "8px" }}>作品编号</span>
              <span style={{ color: "#b0b0c8", fontFamily: "monospace" }}>
                {artwork.url.split("/").pop()?.split(".")[0]?.slice(0, 12)}
              </span>
            </div>
            <div className="artwork-info-row" style={{ padding: "4px 8px", borderRadius: "6px", margin: "0 -8px" }}>
              <span style={{ color: "#666688", marginRight: "8px" }}>收藏于</span>
              <span style={{ color: "#b0b0c8" }}>春山故事 · 无限画布</span>
            </div>
          </div>

          {artwork.link && (
            <a
              href={artwork.link}
              target="_blank"
              rel="noopener noreferrer"
              className="artwork-link-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "10px",
                color: "#fff",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
                marginTop: "20px",
                letterSpacing: "0.02em",
              }}
            >
              🔗 查看原作品
              <span style={{ fontSize: "10px", opacity: 0.7 }}>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
