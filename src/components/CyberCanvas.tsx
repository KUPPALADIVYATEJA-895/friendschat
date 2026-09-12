import React, { useEffect, useRef } from 'react';

interface CyberDot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export const CyberCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    isInside: boolean;
    speed: number;
    lastX: number;
    lastY: number;
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    targetX: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    targetY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    isInside: false,
    speed: 0,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initDots();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.isInside = true;

      const dx = e.clientX - mouseRef.current.lastX;
      const dy = e.clientY - mouseRef.current.lastY;
      mouseRef.current.speed = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
      mouseRef.current.lastX = e.clientX;
      mouseRef.current.lastY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isInside = false;
      mouseRef.current.targetX = width / 2;
      mouseRef.current.targetY = height / 2;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Glowing dot colors: Cyber Cyan, Crisp White, Subtle Amber
    const dotColors = [
      '#06b6d4', // Cyan
      '#22d3ee', // Light Cyan
      '#38bdf8', // Sky
      '#ffffff', // White
      '#a5f3fc', // Ice Blue
      '#f59e0b', // Amber highlight
    ];

    let dots: CyberDot[] = [];

    const initDots = () => {
      dots = [];
      const density = Math.min(Math.floor((width * height) / 4500), 220);

      for (let i = 0; i < density; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const color = dotColors[Math.floor(Math.random() * dotColors.length)];
        const size = Math.random() * 2 + 1.2;

        dots.push({
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          size,
          color,
          alpha: Math.random() * 0.5 + 0.3,
          pulseSpeed: Math.random() * 0.03 + 0.01,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    initDots();

    let gridOffset = 0;

    // Render loop
    const render = () => {
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.07;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.07;
      mouseRef.current.speed *= 0.92;

      gridOffset = (gridOffset + 0.4) % 60;

      ctx.clearRect(0, 0, width, height);

      // 1. Dark Base Background with subtle vignette
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        80,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      bgGrad.addColorStop(0, '#0d0e12');
      bgGrad.addColorStop(0.5, '#09090b');
      bgGrad.addColorStop(1, '#050507');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Mouse Parallax
      const mouseParallaxX = (mouseRef.current.x / width - 0.5) * 20;
      const mouseParallaxY = (mouseRef.current.y / height - 0.5) * 20;

      // 2. Cyber Grid Lines (3D Perspective Grid Underlay)
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;

      const gridSize = 60;
      const startX = (mouseParallaxX % gridSize) - gridSize;
      const startY = ((mouseParallaxY + gridOffset) % gridSize) - gridSize;

      // Vertical lines
      for (let x = startX; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = startY; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Ambient Center Holographic Glows
      ctx.save();
      const cyanGlow = ctx.createRadialGradient(
        width * 0.5 + mouseParallaxX * 1.5,
        height * 0.4 + mouseParallaxY * 1.5,
        0,
        width * 0.5 + mouseParallaxX * 1.5,
        height * 0.4 + mouseParallaxY * 1.5,
        Math.min(width, height) * 0.5
      );
      cyanGlow.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
      cyanGlow.addColorStop(0.5, 'rgba(14, 165, 233, 0.02)');
      cyanGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 4. Interactive Escaping Glowing Dots with Connection Links
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const fleeRadius = 160;
      const fleeForce = 8.0;

      // Draw connection lines between nearby dots
      const maxConnectDist = 95;
      ctx.save();
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * 0.12;
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Render dots & apply cursor escape physics
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        const targetX = dot.baseX + mouseParallaxX;
        const targetY = dot.baseY + mouseParallaxY;

        const dx = dot.x - mouseX;
        const dy = dot.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Escape repulsion force from cursor
        if (mouseRef.current.isInside && dist < fleeRadius && dist > 0) {
          const angle = Math.atan2(dy, dx);
          const intensity = Math.pow(1 - dist / fleeRadius, 1.3);
          const force = intensity * fleeForce;

          dot.vx += Math.cos(angle) * force;
          dot.vy += Math.sin(angle) * force;
        }

        // Spring return to base position
        const springX = (targetX - dot.x) * 0.04;
        const springY = (targetY - dot.y) * 0.04;

        dot.vx += springX;
        dot.vy += springY;

        // Damping
        dot.vx *= 0.88;
        dot.vy *= 0.88;

        dot.x += dot.vx;
        dot.y += dot.vy;

        // Pulse alpha
        dot.pulsePhase += dot.pulseSpeed;
        const pulseFactor = Math.sin(dot.pulsePhase) * 0.25 + 0.75;
        const currentAlpha = dot.alpha * pulseFactor;

        // Draw dot
        ctx.save();
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();

        // Glow halo around bright dots
        if (dot.size > 2.0) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = dot.color;
          ctx.globalAlpha = currentAlpha * 0.25;
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. Cursor Interactive Pulse Aura
      if (mouseRef.current.isInside) {
        ctx.save();
        const cursorGlow = ctx.createRadialGradient(
          mouseX,
          mouseY,
          0,
          mouseX,
          mouseY,
          fleeRadius * 0.75
        );
        cursorGlow.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
        cursorGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
        cursorGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = cursorGlow;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, fleeRadius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      id="cyber-canvas-container"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 3D Parallax Grid & Escaping Glowing Dots Canvas Underlay */}
      <canvas
        ref={canvasRef}
        id="cyber-canvas"
        className="w-full h-full block"
      />
    </div>
  );
};
