import React, { useEffect, useRef } from 'react';

interface SplineHeroCanvasProps {
  className?: string;
}

interface NodePoint {
  id: string;
  name: string;
  sub: string;
  angle: number;
  radius: number;
  color: string;
  pulsePhase: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
}

interface EnergyPulse {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
}

export const SplineHeroCanvas: React.FC<SplineHeroCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 0.45;
      mouseY = y * 0.35;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Resize handler
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // 4 Key Agricultural Journey Nodes (Farm -> Marketplace -> Transit -> Home)
    const nodes: NodePoint[] = [
      { id: 'farm', name: 'FARM', sub: 'Harvest Node', angle: -Math.PI * 0.75, radius: 180, color: '#10b981', pulsePhase: 0 },
      { id: 'market', name: 'MARKETPLACE', sub: 'Real-time Stock', angle: -Math.PI * 0.2, radius: 220, color: '#34d399', pulsePhase: 1.5 },
      { id: 'transit', name: 'LOGISTICS', sub: 'Cold Route', angle: Math.PI * 0.3, radius: 240, color: '#06b6d4', pulsePhase: 3.0 },
      { id: 'home', name: 'HOME', sub: 'Verified OTP', angle: Math.PI * 0.85, radius: 190, color: '#3b82f6', pulsePhase: 4.5 },
    ];

    // Background floating ambient particles
    const particleCount = prefersReducedMotion ? 25 : 60;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 600,
        z: Math.random() * 400 - 200,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        vz: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.45 + 0.15,
      });
    }

    // Energy packets travelling between journey nodes
    const pulses: EnergyPulse[] = [
      { fromNode: 0, toNode: 1, progress: 0.1, speed: 0.007 },
      { fromNode: 0, toNode: 1, progress: 0.6, speed: 0.008 },
      { fromNode: 1, toNode: 2, progress: 0.3, speed: 0.006 },
      { fromNode: 1, toNode: 2, progress: 0.85, speed: 0.007 },
      { fromNode: 2, toNode: 3, progress: 0.2, speed: 0.0065 },
      { fromNode: 2, toNode: 3, progress: 0.7, speed: 0.0075 },
    ];

    let time = 0;

    const render = () => {
      time += prefersReducedMotion ? 0.003 : 0.012;

      // Smooth parallax damping
      currentTiltX += (mouseX - currentTiltX) * 0.05;
      currentTiltY += (mouseY - currentTiltY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.55 + currentTiltX * 70;
      const cy = height * 0.5 + currentTiltY * 50;

      // 1. Draw subtle ambient particles with 3D depth perspective
      ctx.save();
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          if (p.x > 400) p.x = -400;
          if (p.x < -400) p.x = 400;
          if (p.y > 300) p.y = -300;
          if (p.y < -300) p.y = 300;
          if (p.z > 200) p.z = -200;
          if (p.z < -200) p.z = 200;
        }

        const fov = 350;
        const scale = fov / (fov + p.z);
        const px = cx + (p.x + currentTiltX * 60) * scale;
        const py = cy + (p.y + currentTiltY * 45) * scale;

        if (scale > 0 && px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha * scale * 0.6})`;
          ctx.fill();
        }
      }
      ctx.restore();

      // 2. Center Agricultural Core: Glowing Radial Energy Fields
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 280);
      coreGradient.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
      coreGradient.addColorStop(0.35, 'rgba(5, 150, 105, 0.06)');
      coreGradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.015)');
      coreGradient.addColorStop(1, 'rgba(9, 9, 11, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, 280, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // 3. Draw Concentric 3D Elliptical Orbital Tracks
      const orbits = [
        { rx: 140, ry: 60, rot: -0.35, alpha: 0.18, dash: [4, 6] },
        { rx: 200, ry: 85, rot: -0.25, alpha: 0.22, dash: [] },
        { rx: 260, ry: 110, rot: -0.15, alpha: 0.15, dash: [3, 8] },
        { rx: 320, ry: 135, rot: -0.05, alpha: 0.1, dash: [6, 12] },
      ];

      for (const orb of orbits) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(orb.rot + currentTiltX * 0.2);
        ctx.beginPath();
        if (orb.dash.length > 0) ctx.setLineDash(orb.dash);
        ctx.ellipse(0, 0, orb.rx, orb.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${orb.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Central Precision Core Geometry (Agricultural Node)
      ctx.save();
      ctx.translate(cx, cy);

      // Rotating core ring
      const coreAngle = time * 0.4;
      ctx.rotate(coreAngle);
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Core reticle markers
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
        ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Inner glowing core
      const innerGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      innerGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.8)');
      innerGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.3)');
      innerGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // Core glyph icon
      ctx.restore();

      // 5. Calculate Node Screen Positions along their orbits
      const nodePos: { x: number; y: number }[] = [];
      nodes.forEach((node, idx) => {
        const orbitAngle = node.angle + (prefersReducedMotion ? 0 : Math.sin(time * 0.3 + idx) * 0.05);
        // Perspective foreshortening (y is compressed)
        const nx = cx + Math.cos(orbitAngle) * node.radius + currentTiltX * 40;
        const ny = cy + Math.sin(orbitAngle) * (node.radius * 0.46) + currentTiltY * 30;
        nodePos.push({ x: nx, y: ny });
      });

      // 6. Draw Interconnecting Bezier Data Trails (Farm -> Marketplace -> Logistics -> Home)
      for (let i = 0; i < nodePos.length - 1; i++) {
        const p1 = nodePos[i];
        const p2 = nodePos[i + 1];

        // Midpoint with curve tension
        const mx = (p1.x + p2.x) * 0.5;
        const my = (p1.y + p2.y) * 0.5 - 25;

        // Spline curve
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Secondary glow line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.08)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Also connect Home back to Farm with faint cycle arc
      {
        const p1 = nodePos[3];
        const p2 = nodePos[0];
        const mx = cx;
        const my = cy + 120;
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 7. Animate Energy Pulses along paths
      pulses.forEach((pulse) => {
        if (!prefersReducedMotion) {
          pulse.progress += pulse.speed;
          if (pulse.progress > 1) pulse.progress = 0;
        }

        const p1 = nodePos[pulse.fromNode];
        const p2 = nodePos[pulse.toNode];
        const mx = (p1.x + p2.x) * 0.5;
        const my = (p1.y + p2.y) * 0.5 - 25;

        // Quadratic bezier position
        const tVal = pulse.progress;
        const qx = (1 - tVal) * (1 - tVal) * p1.x + 2 * (1 - tVal) * tVal * mx + tVal * tVal * p2.x;
        const qy = (1 - tVal) * (1 - tVal) * p1.y + 2 * (1 - tVal) * tVal * my + tVal * tVal * p2.y;

        // Pulse glow
        const pulseGrad = ctx.createRadialGradient(qx, qy, 0, qx, qy, 10);
        pulseGrad.addColorStop(0, '#ffffff');
        pulseGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.9)');
        pulseGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.beginPath();
        ctx.arc(qx, qy, 7, 0, Math.PI * 2);
        ctx.fillStyle = pulseGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(qx, qy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // 8. Render the 4 Journey Nodes with Halo and Telemetry Monospace Labels
      nodePos.forEach((pos, idx) => {
        const node = nodes[idx];
        const pulseRing = ((time * 1.5 + node.pulsePhase) % 2.5) / 2.5;

        // Pulsing radar wave around node
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8 + pulseRing * 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${Math.max(0, (1 - pulseRing) * 0.55)})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node outer ring
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#09090b';
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node center jewel
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Monospace Telemetry Card (Obsidian glass tag)
        const labelX = pos.x + 14;
        const labelY = pos.y - 10;

        // Background tag pill
        ctx.fillStyle = 'rgba(15, 17, 21, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;

        const tagWidth = 100;
        const tagHeight = 28;
        const radius = 6;

        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(labelX, labelY - 14, tagWidth, tagHeight, radius);
        } else {
          ctx.rect(labelX, labelY - 14, tagWidth, tagHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Node Title
        ctx.font = '600 10px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(node.name, labelX + 8, labelY - 2);

        // Subtitle
        ctx.font = '500 8.5px sans-serif';
        ctx.fillStyle = 'rgba(161, 161, 170, 0.9)';
        ctx.fillText(node.sub, labelX + 8, labelY + 9);
      });

      // 9. Floating Orbiting Telemetry Badges
      const telemetryItems = [
        { text: 'TRACEABLE BATCH', xOffset: -220, yOffset: -140, pulse: 0.8 },
        { text: 'REAL-TIME STOCK', xOffset: 240, yOffset: -120, pulse: 0.5 },
        { text: 'SMART ROUTING', xOffset: -180, yOffset: 160, pulse: 0.2 },
        { text: 'AI AGRONOMY', xOffset: 210, yOffset: 130, pulse: 0.9 },
      ];

      telemetryItems.forEach((item, idx) => {
        const floatY = Math.sin(time * 0.8 + idx * 1.5) * 6;
        const tx = cx + item.xOffset + currentTiltX * 30;
        const ty = cy + item.yOffset + floatY + currentTiltY * 25;

        // Guard bounds
        if (tx < 30 || tx > width - 130) return;

        ctx.save();
        ctx.fillStyle = 'rgba(12, 14, 18, 0.78)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = 1;

        const w = 115;
        const h = 22;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(tx, ty, w, h, 4);
        } else {
          ctx.rect(tx, ty, w, h);
        }
        ctx.fill();
        ctx.stroke();

        // Blinking indicator dot
        ctx.beginPath();
        ctx.arc(tx + 10, ty + 11, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${0.4 + Math.sin(time * 2 + idx) * 0.4})`;
        ctx.fill();

        // Text
        ctx.font = '600 8.5px monospace';
        ctx.fillStyle = 'rgba(228, 228, 231, 0.92)';
        ctx.fillText(item.text, tx + 18, ty + 14);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ touchAction: 'none' }}
      aria-hidden="true"
    />
  );
};
