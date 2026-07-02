
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
  if (!artwork) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          overflow: "hidden",
          maxWidth: "700px",
          width: "90%",
          maxHeight: "85vh",
          display: "flex",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧图片 */}
        <div
          style={{
            flex: "0 0 45%",
            backgroundColor: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <img
            src={artwork.url}
            alt={artwork.title}
            style={{
              maxWidth: "100%",
              maxHeight: "400px",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
          />
        </div>

        {/* 右侧信息 */}
        <div
          style={{
            flex: 1,
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            style={{
              alignSelf: "flex-end",
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999",
              padding: "4px 8px",
              lineHeight: 1,
            }}
          >
            ×
          </button>

          {/* 标题 */}
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1a1a1a",
              margin: "12px 0 8px 0",
              lineHeight: 1.3,
            }}
          >
            {artwork.title}
          </h2>

          {/* 艺术家 */}
          <p
            style={{
              fontSize: "15px",
              color: "#666",
              margin: "0 0 16px 0",
            }}
          >
            {artwork.artist}
          </p>

          {/* 分隔线 */}
          <div
            style={{
              height: "1px",
              background: "#eee",
              margin: "8px 0 16px 0",
            }}
          />

          {/* 详细信息 */}
          <div style={{ fontSize: "14px", color: "#555", lineHeight: 1.8 }}>
            <div>
              <strong style={{ color: "#333", minWidth: "70px", display: "inline-block" }}>
                创作年份
              </strong>
              {artwork.year || "未知"}
            </div>
            <div>
              <strong style={{ color: "#333", minWidth: "70px", display: "inline-block" }}>
                作品类型
              </strong>
              {artwork.type || "图片"}
            </div>
            <div>
              <strong style={{ color: "#333", minWidth: "70px", display: "inline-block" }}>
                尺寸
              </strong>
              {artwork.width && artwork.height
                ? `${artwork.width} × ${artwork.height}`
                : "未知"}
            </div>
          </div>

          {/* 描述文字 */}
          <p
            style={{
              marginTop: "20px",
              fontSize: "13px",
              color: "#888",
              fontStyle: "italic",
              lineHeight: 1.6,
              borderTop: "1px solid #f0f0f0",
              paddingTop: "16px",
            }}
          >
            点击画面可关闭此窗口。
          </p>
        </div>
      </div>
    </div>
  );
}
