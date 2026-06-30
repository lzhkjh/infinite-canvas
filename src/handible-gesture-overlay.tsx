import * as React from 'react';

interface HandibleGestureOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  gestureState: any;
  onStop: () => void;
}

export function HandibleGestureOverlay({ videoRef, gestureState, onStop }: HandibleGestureOverlayProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      fontFamily: 'Arial, sans-serif',
      minWidth: '220px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#00ffff' }}>
        手势控制 (Handible)
      </h3>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', marginBottom: '5px', color: '#aaa' }}>当前手势:</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {gestureState.forward && '前进 👆'}
          {gestureState.backward && '后退 ✋'}
          {gestureState.left && '左转 ⬅'}
          {gestureState.right && '右转 ➡'}
          {gestureState.up && '上升 ⬆'}
          {gestureState.down && '下降 ⬇'}
          {gestureState.pinch && '捏合 🤏'}
          {!gestureState.forward && !gestureState.backward && !gestureState.left && 
           !gestureState.right && !gestureState.up && !gestureState.down && !gestureState.pinch && 
           '等待手势...'}
        </div>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '10px' }}>
        速度: {Math.round(gestureState.velocity * 100)}%
      </div>
      <video 
        ref={videoRef}
        style={{
          width: '160px',
          height: '120px',
          borderRadius: '5px',
          border: '2px solid #00ffff',
          transform: 'scaleX(-1)',
          display: 'block'
        }}
        autoPlay
        muted
        playsInline
      />
      <button 
        onClick={onStop}
        style={{
          marginTop: '10px',
          width: '100%',
          padding: '8px',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 'bold'
        }}
      >
        停止手势控制
      </button>
    </div>
  );
}
