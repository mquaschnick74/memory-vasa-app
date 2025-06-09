import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ isActive = false, isVASASpeaking = false }) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);

  const barCount = 64;
  const prevAmplitudes = useRef(new Float32Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const barWidth = (canvas.width / barCount) * 1.5;
    const maxBarHeight = canvas.height * 0.6;

    // Core draw function
    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get timestamp for sinewave motion
      const now = Date.now();
      const phaseShift = (now % 8000) / 8000; // full wave cycle every 8s

      // If mic is active and allowed, pull amplitude data
      if (isActive && !isVASASpeaking && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        for (let i = 0; i < barCount; i++) {
          const value = dataArrayRef.current[i] || 0;
          prevAmplitudes.current[i] = prevAmplitudes.current[i] * 0.9 + value * 0.1;
        }
      } else {
        // Gradual decay when no voice data
        prevAmplitudes.current = prevAmplitudes.current.map(v => v * 0.9);
      }

      // Draw bars based on persistent sinewave + active overlay
      for (let i = 0; i < barCount; i++) {
        const progress = (i / barCount) + phaseShift;
        const sine = Math.sin(progress * Math.PI * 2);
        const norm = (sine + 1) / 2;

        const barHeight = norm * maxBarHeight + 10;
        const x = i * barWidth;
        const topPadding = 0;
        const y = canvas.height - barHeight - topPadding;           const intensity = prevAmplitudes.current[i] / 255;
        const alpha = 0.2 + intensity * 0.6;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        if (intensity > 0.5) {
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 4;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }
    };

    // Start drawing loop
    animationIdRef.current = requestAnimationFrame(draw);

    // Init audio only once
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        analyserRef.current.smoothingTimeConstant = 0.85;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
      } catch (err) {
        console.warn('Mic access denied or unavailable:', err);
      }
    };

    initAudio();

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, isVASASpeaking]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'end',
      justifyContent: 'center',
      height: '80px',
      width: '100%',
      maxWidth: '1024px',
      padding: '0 20px'
    }}>
      <canvas
        ref={canvasRef}
        width={350}
        height={70}
        style={{
          background: 'transparent',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default AudioVisualizer;
