import React, { useEffect, useRef } from 'react';

interface LiveBackgroundProps {
  alertType?: string;
}

const LiveBackground: React.FC<LiveBackgroundProps> = ({ alertType }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    
    // Resize canvas to cover screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize particles based on alert type
    const initParticles = () => {
      particles = [];
      const isRain = alertType === 'Immense Rain' || alertType === 'Thunderstorm';
      const isFire = alertType === 'Forest Fire';
      const count = isRain ? 400 : (isFire ? 150 : 0);

      for (let i = 0; i < count; i++) {
        if (isRain) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speedY: Math.random() * 20 + 20,
            speedX: Math.random() * 2 - 4, // rain blows sideways slightly
            length: Math.random() * 30 + 20,
            opacity: Math.random() * 0.4 + 0.1
          });
        }
        if (isFire) {
          particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * 100, // start from bottom
            speedY: Math.random() * -3 - 1,
            speedX: Math.random() * 2 - 1,
            size: Math.random() * 4 + 1,
            opacity: Math.random() * 0.8 + 0.2,
            life: Math.random() * 100
          });
        }
      }
    };
    initParticles();

    // Flash effect variable for thunderstorm
    let flashOpacity = 0;

    const render = () => {
      const isRain = alertType === 'Immense Rain' || alertType === 'Thunderstorm';
      const isThunder = alertType === 'Thunderstorm';
      const isFire = alertType === 'Forest Fire';

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isThunder) {
        if (Math.random() < 0.01) {
          flashOpacity = 1.0;
        }
        if (flashOpacity > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          flashOpacity -= 0.05;
        }
      }

      for (let p of particles) {
        if (isRain) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(200, 220, 255, ${p.opacity})`;
          ctx.lineWidth = 1.5;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX, p.y + p.length);
          ctx.stroke();

          p.y += p.speedY;
          p.x += p.speedX;

          // Reset drop
          if (p.y > canvas.height) {
            p.y = -p.length;
            p.x = Math.random() * canvas.width + 200; // Account for sideways drift
          }
        }
        
        if (isFire) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, ${(Math.random() * 100) + 100}, 0, ${p.opacity})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speedY;
          p.x += p.speedX;
          p.opacity -= 0.005;

          if (p.opacity <= 0 || p.y < 0) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
            p.opacity = Math.random() * 0.8 + 0.2;
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [alertType]);

  // Determine background image based on active alert
  let bgImage = 'none';
  let blurClass = 'blur-[6px]';
  let ambientCol1 = '', ambientCol2 = '';

  switch (alertType) {
    case 'Forest Fire':
      bgImage = 'url(/forest_fire.png)';
      ambientCol1 = 'bg-red-600';
      ambientCol2 = 'bg-orange-600';
      break;
    case 'Immense Rain':
      bgImage = 'url(/storm_bg.png)';
      ambientCol1 = 'bg-blue-600';
      ambientCol2 = 'bg-cyan-600';
      blurClass = 'blur-[4px]'; // less blur for stormy feel
      break;
    case 'Thunderstorm':
      bgImage = 'url(/storm_bg.png)';
      ambientCol1 = 'bg-purple-800';
      ambientCol2 = 'bg-blue-900';
      blurClass = 'blur-[4px]';
      break;
    case 'Tree Clogging':
      bgImage = 'url(/clog_bg.png)';
      ambientCol1 = 'bg-amber-800';
      ambientCol2 = 'bg-green-900';
      break;
    default:
      // Default ambient state
      bgImage = 'url(/clog_bg.png)'; // fallback ambient deep forest
      ambientCol1 = 'bg-green-900';
      ambientCol2 = 'bg-emerald-900';
      break;
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black transition-colors duration-1000 pointer-events-none">
      {/* Animated Image Layer (pans slowly) */}
      <div 
        className={`absolute w-full h-full bg-cover bg-center filter ${blurClass} opacity-50 scale-110 transition-all duration-1000 ease-in-out`}
        style={{ 
          backgroundImage: bgImage !== 'none' ? bgImage : undefined,
          animation: 'panZoom 30s infinite alternate ease-in-out'
        }}
      ></div>

      {/* Ambient Colored Blobs */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full mix-blend-screen filter blur-[128px] opacity-60 transition-colors duration-[2s] ${ambientCol1}`}></div>
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full mix-blend-screen filter blur-[128px] opacity-60 transition-colors duration-[2s] ${ambientCol2}`}></div>

      {/* Lightning full-screen flash effect using CSS if Thunderstorm */}
      {alertType === 'Thunderstorm' && (
        <div className="absolute inset-0 bg-white mix-blend-overlay animate-[flicker_4s_infinite] opacity-0"></div>
      )}

      {/* Canvas for Particle System (Rain/Fire Sparks) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80 mix-blend-screen"></canvas>

      {/* Bottom Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
    </div>
  );
};

export default LiveBackground;
