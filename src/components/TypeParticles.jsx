import { useEffect, useRef, useMemo } from "react";

// ─── seeded RNG for stable CSS fallback layouts ───────────────
function mkRng(seed) {
  let s = Math.abs(seed) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function seedFrom(str) { return str.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7); }

// ─── canvas size helper ───────────────────────────────────────
function sizeCanvas(canvas) {
  const p = canvas.parentElement;
  canvas.width  = p?.offsetWidth  || 400;
  canvas.height = p?.offsetHeight || 320;
}

// ╔══════════════════════════════════════════════════════════╗
// ║  🔥  FIRE  – golden mass-fire, 3 layers + embers        ║
// ╚══════════════════════════════════════════════════════════╝
function FireEffect() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    sizeCanvas(canvas);
    const ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height, id;

    // layer: 0=outer glow (wide, very blurry), 1=mid golden, 2=inner bright core
    class FlameTongue {
      constructor(xFrac, layer) {
        this.xFrac   = xFrac;
        this.layer   = layer;
        this.sway    = Math.random() * Math.PI * 2;
        this.swaySpd = 0.014 + Math.random() * 0.014;
        this.flk     = Math.random() * Math.PI * 2;
        this.flkSpd  = 0.032 + Math.random() * 0.030;
        this.tip     = Math.random() * Math.PI * 2;
        this.tipSpd  = 0.020 + Math.random() * 0.020;
        // wider flames for golden mass look
        if (layer === 0) { this.wBase = 0.10 + Math.random()*0.07; this.hBase = 0.20+Math.random()*0.22; }
        if (layer === 1) { this.wBase = 0.06 + Math.random()*0.05; this.hBase = 0.28+Math.random()*0.28; }
        if (layer === 2) { this.wBase = 0.035+ Math.random()*0.028;this.hBase = 0.32+Math.random()*0.30; }
      }
      update() {
        this.sway += this.swaySpd;
        this.flk  += this.flkSpd;
        this.tip  += this.tipSpd;
      }
      draw() {
        const flk = 0.88 + 0.12 * Math.sin(this.flk);
        const fw  = W * this.wBase * flk;
        const fh  = H * this.hBase * (0.90 + 0.10 * Math.sin(this.flk * 1.4));
        const bx  = W * this.xFrac + Math.sin(this.sway) * fw * 0.40;
        const by  = H * 0.93;
        const tx  = bx + Math.sin(this.tip) * fw * 0.55;
        const ty  = by - fh;

        const g = ctx.createLinearGradient(bx, by, tx, ty);
        if (this.layer === 0) {          // outer soft glow — amber/orange
          g.addColorStop(0,    "rgba(255,155,  0,0.75)");
          g.addColorStop(0.28, "rgba(255, 80,  0,0.55)");
          g.addColorStop(0.62, "rgba(200, 20,  0,0.25)");
          g.addColorStop(1,    "rgba( 80,  0,  0,0)");
        } else if (this.layer === 1) {   // mid — golden-orange
          g.addColorStop(0,    "rgba(255,210, 10,0.92)");
          g.addColorStop(0.18, "rgba(255,150,  0,0.88)");
          g.addColorStop(0.50, "rgba(255, 60,  0,0.70)");
          g.addColorStop(0.78, "rgba(190, 10,  0,0.38)");
          g.addColorStop(1,    "rgba( 80,  0,  0,0)");
        } else {                          // inner core — white→gold→orange
          g.addColorStop(0,    "rgba(255,255,210,0.98)");
          g.addColorStop(0.08, "rgba(255,230, 30,0.96)");
          g.addColorStop(0.35, "rgba(255,140,  0,0.88)");
          g.addColorStop(0.65, "rgba(240, 45,  0,0.60)");
          g.addColorStop(1,    "rgba(140,  0,  0,0)");
        }

        // organic bezier — wide shoulders, converging to wobbling tip
        ctx.beginPath();
        ctx.moveTo(bx - fw * 0.52, by);
        ctx.bezierCurveTo(
          bx - fw * 1.18, by - fh * 0.38,
          bx - fw * 0.18 + tx * 0.08, ty + fh * 0.09,
          tx, ty
        );
        ctx.bezierCurveTo(
          bx + fw * 0.18 + tx * 0.08, ty + fh * 0.09,
          bx + fw * 1.18, by - fh * 0.38,
          bx + fw * 0.52, by
        );
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    class Ember {
      reset(s=false) {
        this.x=W*0.15+Math.random()*W*0.70; this.y=H*0.86+Math.random()*H*0.06;
        this.vx=(Math.random()-0.5)*1.5; this.vy=-(2.5+Math.random()*3.5);
        this.r=1+Math.random()*2; this.maxL=38+Math.random()*38;
        this.life=s?Math.random()*this.maxL:0;
      }
      constructor(){this.reset(true);}
      update(){this.life++;this.x+=this.vx+(Math.random()-0.5)*0.4;this.y+=this.vy;this.vy*=0.984;if(this.life>=this.maxL)this.reset();}
      draw(){
        const a=Math.sin((this.life/this.maxL)*Math.PI);
        ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,${Math.floor(200+Math.random()*55)},80,${a})`;ctx.fill();
      }
    }

    // 4 outer glow (spread wide), 3 mid golden, 2 inner core, 6 embers
    const outer  = Array.from({length:4},(_,i)=>new FlameTongue(0.08+(i/3)*0.82, 0));
    const mid    = Array.from({length:3},(_,i)=>new FlameTongue(0.20+(i/2)*0.60, 1));
    const core   = Array.from({length:2},(_,i)=>new FlameTongue(0.32+(i/1)*0.36, 2));
    const embers = Array.from({length:6},()=>new Ember());

    const render = () => {
      ctx.clearRect(0,0,W,H);

      // warm golden pool at base
      const bg = ctx.createRadialGradient(W/2,H*0.94,0, W/2,H*0.94,W*0.58);
      bg.addColorStop(0,    "rgba(255,150,0,0.55)");
      bg.addColorStop(0.40, "rgba(255,70,0,0.22)");
      bg.addColorStop(0.70, "rgba(180,20,0,0.08)");
      bg.addColorStop(1,    "rgba(0,0,0,0)");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      ctx.globalCompositeOperation="lighter";
      ctx.filter="blur(9px)";  outer.forEach(f=>{f.update();f.draw();});
      ctx.filter="blur(3px)";  mid.forEach(f=>{f.update();f.draw();});
      ctx.filter="blur(1px)";  core.forEach(f=>{f.update();f.draw();});
      ctx.filter="none";       embers.forEach(e=>{e.update();e.draw();});
      ctx.globalCompositeOperation="source-over";

      id=requestAnimationFrame(render);
    };
    render();
    return ()=>cancelAnimationFrame(id);
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}/>;
}

// ╔═══════════════════════════════════════════╗
// ║  💧  WATER  – canvas bubbles with glow   ║
// ╚═══════════════════════════════════════════╝
function WaterEffect() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    sizeCanvas(canvas);
    const ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height, id;

    class Bubble {
      reset(scatter = false) {
        this.x   = W * 0.05 + Math.random() * W * 0.90;
        this.y   = H * (scatter ? Math.random() : 0.95);
        this.r   = 4 + Math.random() * 14;
        this.vy  = -(0.5 + Math.random() * 1.2);
        this.vx  = (Math.random() - 0.5) * 0.35;
        this.life= 0;
        this.maxLife = (H * 0.90 / Math.abs(this.vy)) | 0;
        this.phase = Math.random() * Math.PI * 2;
      }
      constructor() { this.reset(true); }
      update() {
        this.life++;
        this.phase += 0.04;
        this.x += this.vx + Math.sin(this.phase) * 0.25;
        this.y += this.vy;
        if (this.y < -this.r * 2) this.reset();
      }
      draw() {
        const t = this.life / this.maxLife;
        const a = Math.min(1, t * 5) * Math.min(1, (1-t) * 4) * 0.75;
        if (a <= 0) return;
        // hollow circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(140,220,255,${a * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // inner shimmer highlight
        const hl = ctx.createRadialGradient(
          this.x - this.r*0.35, this.y - this.r*0.35, 0,
          this.x, this.y, this.r);
        hl.addColorStop(0, `rgba(255,255,255,${a * 0.75})`);
        hl.addColorStop(0.4, `rgba(180,230,255,${a * 0.15})`);
        hl.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = hl;
        ctx.fill();
      }
    }

    const pts = Array.from({ length: 35 }, () => new Bubble());
    const render = () => {
      ctx.clearRect(0,0,W,H);
      const bg = ctx.createRadialGradient(W/2,H*0.85,0,W/2,H*0.85,W*0.55);
      bg.addColorStop(0,"rgba(0,120,220,0.12)");
      bg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      pts.forEach(p => { p.update(); p.draw(); });
      id = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1 }} />;
}

// ╔═══════════════════════════════════════════════════════╗
// ║  ⚡  ELECTRIC  – fractal lightning + spark swarm     ║
// ╚═══════════════════════════════════════════════════════╝
function ElectricEffect() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    sizeCanvas(canvas);
    const ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height, id, frame = 0;

    // draw a jagged lightning branch recursively
    function bolt(x1,y1,x2,y2,depth,alpha) {
      if (depth === 0) {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
        ctx.strokeStyle = `rgba(255,255,200,${alpha})`;
        ctx.lineWidth = alpha * 2;
        ctx.stroke(); return;
      }
      const mx = (x1+x2)/2 + (Math.random()-0.5)*(Math.abs(y2-y1)*0.8);
      const my = (y1+y2)/2 + (Math.random()-0.5)*(Math.abs(y2-y1)*0.2);
      bolt(x1,y1,mx,my,depth-1,alpha);
      bolt(mx,my,x2,y2,depth-1,alpha);
      if (depth === 2 && Math.random()<0.35) {
        bolt(mx,my, mx+(Math.random()-0.5)*60, my+Math.random()*50, depth-2, alpha*0.5);
      }
    }

    class Spark {
      reset(scatter=false){
        this.x = W*0.1+Math.random()*W*0.8;
        this.y = H*0.1+Math.random()*H*0.8;
        this.vx=(Math.random()-0.5)*5; this.vy=(Math.random()-0.5)*5;
        this.life=0; this.maxLife=8+Math.random()*18;
        this.r=1+Math.random()*2.5;
        if(scatter) this.life=Math.random()*this.maxLife;
      }
      constructor(){ this.reset(true); }
      update(){ this.life++; this.vx*=0.92; this.vy*=0.92; this.x+=this.vx; this.y+=this.vy; if(this.life>=this.maxLife)this.reset(); }
      draw(){
        const a=(1-this.life/this.maxLife)*0.9;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,${Math.random()>0.5?80:200},${a})`; ctx.fill();
        ctx.shadowBlur=8; ctx.shadowColor="rgba(255,255,0,0.8)";
        ctx.fill(); ctx.shadowBlur=0;
      }
    }

    const sparks = Array.from({length:40},()=>new Spark());
    let boltTimer=0, boltAlpha=0, bx1,by1,bx2,by2;

    const render = () => {
      ctx.clearRect(0,0,W,H);
      frame++;
      // glow pulse
      const pulse = 0.08 + 0.04*Math.sin(frame*0.12);
      const bg = ctx.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,W*0.5);
      bg.addColorStop(0,`rgba(180,180,0,${pulse})`);
      bg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      // trigger new bolt occasionally
      if(--boltTimer<=0){
        boltTimer=10+Math.floor(Math.random()*25);
        boltAlpha=0.9+Math.random()*0.1;
        bx1=W*0.15+Math.random()*W*0.7; by1=0;
        bx2=W*0.15+Math.random()*W*0.7; by2=H*0.75+Math.random()*H*0.2;
      }
      if(boltAlpha>0.05){
        ctx.shadowBlur=18; ctx.shadowColor="rgba(255,255,100,0.9)";
        bolt(bx1,by1,bx2,by2,3,boltAlpha);
        ctx.shadowBlur=0;
        boltAlpha*=0.72;
      }
      ctx.globalCompositeOperation="lighter";
      sparks.forEach(s=>{ s.update(); s.draw(); });
      ctx.globalCompositeOperation="source-over";
      id=requestAnimationFrame(render);
    };
    render();
    return ()=>cancelAnimationFrame(id);
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}/>;
}

// ╔══════════════════════════════════════════════════════╗
// ║  👻  GHOST  – canvas wisps, additive glow           ║
// ╚══════════════════════════════════════════════════════╝
function GhostEffect() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    sizeCanvas(canvas);
    const ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height, id;

    class Wisp {
      reset(scatter=false){
        this.x  = W*0.1+Math.random()*W*0.8;
        this.y  = H*0.1+Math.random()*H*0.8;
        this.tx = this.x+(Math.random()-0.5)*W*0.4;
        this.ty = this.y-(Math.random()*H*0.35);
        this.r  = 10+Math.random()*22;
        this.life=0; this.maxLife=90+Math.random()*90;
        this.hue=260+Math.random()*60;
        if(scatter) this.life=Math.random()*this.maxLife;
      }
      constructor(){this.reset(true);}
      update(){
        this.life++;
        const t=this.life/this.maxLife;
        this.x+=(this.tx-this.x)*0.012;
        this.y+=(this.ty-this.y)*0.012;
        if(this.life>=this.maxLife)this.reset();
      }
      draw(){
        const t=this.life/this.maxLife;
        const a=Math.sin(t*Math.PI)*0.55;
        if(a<=0)return;
        const grd=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);
        grd.addColorStop(0,`hsla(${this.hue},100%,80%,${a})`);
        grd.addColorStop(0.5,`hsla(${this.hue},80%,50%,${(a*0.4).toFixed(2)})`);
        grd.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.fill();
      }
    }

    const wisps=Array.from({length:20},()=>new Wisp());
    const render=()=>{
      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation="lighter";
      wisps.forEach(w=>{w.update();w.draw();});
      ctx.globalCompositeOperation="source-over";
      id=requestAnimationFrame(render);
    };
    render();
    return ()=>cancelAnimationFrame(id);
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}/>;
}

// ╔══════════════════════════════════════════════════════╗
// ║  🔮  PSYCHIC  – canvas orbiting star-orbs + rings   ║
// ╚══════════════════════════════════════════════════════╝
function PsychicEffect() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    sizeCanvas(canvas);
    const ctx = canvas.getContext("2d");
    let W = canvas.width, H = canvas.height, id, frame=0;

    const cx = W/2, cy = H*0.48;
    const orbs = Array.from({length:12},(_, i)=>({
      angle: (i/12)*Math.PI*2,
      speed: 0.006+Math.random()*0.008,
      rx: W*0.28+Math.random()*W*0.10,
      ry: H*0.22+Math.random()*H*0.08,
      r:  3+Math.random()*5,
      hue:300+Math.random()*70,
      phase: Math.random()*Math.PI*2,
    }));
    const rings=Array.from({length:5},(_,i)=>({
      r:0, maxR:40+i*18, alpha:0, timer:i*28,
      cx: W*0.25+Math.random()*W*0.5, cy: H*0.25+Math.random()*H*0.5,
    }));

    const render=()=>{
      ctx.clearRect(0,0,W,H);
      frame++;
      ctx.globalCompositeOperation="lighter";
      orbs.forEach(o=>{
        o.angle+=o.speed;
        o.phase+=0.04;
        const x=cx+Math.cos(o.angle)*o.rx;
        const y=cy+Math.sin(o.angle)*o.ry;
        const pulse=0.8+0.2*Math.sin(o.phase);
        const grd=ctx.createRadialGradient(x,y,0,x,y,o.r*3*pulse);
        grd.addColorStop(0,`hsla(${o.hue},100%,85%,0.95)`);
        grd.addColorStop(0.4,`hsla(${o.hue},100%,60%,0.4)`);
        grd.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x,y,o.r*3*pulse,0,Math.PI*2);
        ctx.fillStyle=grd; ctx.fill();
      });
      ctx.globalCompositeOperation="source-over";
      rings.forEach(ring=>{
        ring.timer--;
        if(ring.timer<=0){
          ring.r+=2.5; ring.alpha=Math.max(0,ring.alpha-0.018);
          ctx.beginPath(); ctx.arc(ring.cx,ring.cy,ring.r,0,Math.PI*2);
          ctx.strokeStyle=`rgba(240,120,210,${ring.alpha})`;
          ctx.lineWidth=1.5; ctx.stroke();
          if(ring.r>=ring.maxR){ ring.r=0; ring.alpha=0.65; ring.timer=40+Math.floor(Math.random()*40); ring.cx=W*0.2+Math.random()*W*0.6; ring.cy=H*0.2+Math.random()*H*0.6; }
        }
      });
      id=requestAnimationFrame(render);
    };
    render();
    return ()=>cancelAnimationFrame(id);
  },[]);
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}/>;
}

// ╔═════════════════════════════════════════════════════╗
// ║  CSS-based effects (grass, ice, poison, dark, etc.) ║
// ╚═════════════════════════════════════════════════════╝
const CSS_EFFECTS = {
  grass: {
    keyframes: `
      @keyframes leaf-fall { 0%{transform:translateY(0) rotate(0deg) translateX(0);opacity:.92} 100%{transform:translateY(280px) rotate(var(--rot)) translateX(var(--sx));opacity:0} }
      @keyframes pollen-f  { 0%{transform:translateY(0) translateX(0);opacity:.7} 50%{transform:translateY(-35px) translateX(var(--sx));opacity:.9} 100%{transform:translateY(-90px) translateX(calc(var(--sx)*1.6));opacity:0} }
    `,
    build: (rng) => {
      const leafColors = ["#22c55e","#16a34a","#4ade80","#86efac","#15803d","#a3e635"];
      const leaves = Array.from({length:14},()=>{ const w=9+rng()*14,h=w*(0.38+rng()*0.3),col=leafColors[0|(rng()*leafColors.length)]; return { style:{ position:"absolute",width:`${w}px`,height:`${h}px`,top:`${-2+rng()*3}%`,left:`${2+rng()*93}%`,background:col,borderRadius:"0% 80% 0% 80%",boxShadow:`0 2px 8px ${col}66`,animation:`leaf-fall ${2.8+rng()*2.5}s ease-in ${rng()*6}s infinite`,"--rot":`${200+rng()*400}deg`,"--sx":`${(rng()-.5)*95}px` }}; });
      const pollen = Array.from({length:10},()=>({ style:{ position:"absolute",width:`${2.5+rng()*4}px`,height:`${2.5+rng()*4}px`,borderRadius:"50%",left:`${5+rng()*88}%`,bottom:`${10+rng()*60}%`,background:"rgba(200,255,150,.85)",boxShadow:"0 0 8px rgba(150,255,100,.6)",animation:`pollen-f ${4+rng()*4}s ease-in-out ${rng()*6}s infinite`,"--sx":`${(rng()-.5)*45}px` }}));
      return [...leaves,...pollen];
    },
  },
  ice: {
    keyframes: `
      @keyframes flake-fall { 0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:0} 8%{opacity:var(--op)} 88%{opacity:var(--op)} 100%{transform:translateY(290px) translateX(var(--sx)) rotate(400deg);opacity:0} }
      @keyframes frost-pulse { 0%,100%{transform:scale(1) rotate(0deg);opacity:var(--op)} 50%{transform:scale(1.4) rotate(45deg);opacity:calc(var(--op)*.5)} }
    `,
    build: (rng) => {
      const flakes = Array.from({length:13},()=>{ const sz=10+rng()*16,op=0.5+rng()*0.45; return { style:{ position:"absolute",left:`${2+rng()*92}%`,top:`${-3+rng()*3}%`,fontSize:`${sz}px`,lineHeight:1,color:`rgba(200,240,255,${op})`,textShadow:"0 0 10px rgba(150,220,255,.9),0 0 20px rgba(100,180,255,.5)",animation:`flake-fall ${4+rng()*4.5}s linear ${rng()*7}s infinite`,"--sx":`${(rng()-.5)*55}px`,"--op":op,userSelect:"none" }, char:"❄" }});
      const frost = Array.from({length:8},()=>{ const sz=4+rng()*7,op=0.4+rng()*0.5; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"20%",left:`${5+rng()*88}%`,top:`${5+rng()*62}%`,background:"rgba(200,240,255,.85)",boxShadow:`0 0 ${sz*1.2}px rgba(150,220,255,.85)`,animation:`frost-pulse ${3+rng()*3}s ease-in-out ${rng()*5}s infinite`,"--op":op }}});
      return [...flakes,...frost];
    },
  },
  poison: {
    keyframes: `
      @keyframes poison-bub { 0%{transform:translateY(0) translateX(0) scale(.58);opacity:0} 10%{opacity:.78} 88%{opacity:.78} 100%{transform:translateY(-125px) translateX(var(--hx)) scale(1.12);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:14},()=>{ const sz=6+rng()*16; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${4+rng()*88}%`,bottom:`${3+rng()*55}%`,background:`radial-gradient(circle at 32% 28%, rgba(255,200,255,.72) 0%, rgba(180,50,220,.08) 55%, transparent 78%)`,border:`1.5px solid rgba(180,50,220,.75)`,boxShadow:`0 0 ${sz*.55}px rgba(160,30,200,.55),inset 0 0 ${sz*.3}px rgba(255,150,255,.28)`,animation:`poison-bub ${2.5+rng()*3.2}s ease-in-out ${rng()*5.5}s infinite`,"--hx":`${(rng()-.5)*32}px` }};});
    },
  },
  dark: {
    keyframes: `
      @keyframes smoke-waft { 0%{transform:translateY(0) translateX(0) scale(.35);opacity:0} 14%{transform:scale(1);opacity:.38} 78%{opacity:0} 100%{transform:translateY(-110px) translateX(var(--sx)) scale(1.9);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:11},()=>{ const sz=18+rng()*38; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${4+rng()*83}%`,bottom:`${0+rng()*22}%`,background:`radial-gradient(circle, rgba(60,0,90,.52) 0%, rgba(10,0,25,.3) 50%, transparent 82%)`,filter:"blur(7px)",animation:`smoke-waft ${3+rng()*3.5}s ease-in-out ${rng()*5.5}s infinite`,"--sx":`${(rng()-.5)*55}px` }};});
    },
  },
  dragon: {
    keyframes: `
      @keyframes scale-fly { 0%{transform:translateY(0) rotate(0deg) scale(1);opacity:.88} 55%{opacity:.88} 100%{transform:translateY(var(--sy)) rotate(360deg) scale(.12);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:13},()=>{ const w=10+rng()*14,h=w*(0.62+rng()*0.3),hue=rng()>.5?270:42; return { style:{ position:"absolute",width:`${w}px`,height:`${h}px`,left:`${4+rng()*87}%`,top:`${5+rng()*82}%`,background:`hsla(${hue},100%,65%,.92)`,borderRadius:"45% 0% 45% 0%",boxShadow:`0 0 10px hsla(${hue},100%,60%,.7)`,animation:`scale-fly ${2+rng()*2.5}s ease-in-out ${rng()*4.5}s infinite`,"--sy":`${-(55+rng()*70)}px` }};});
    },
  },
  steel: {
    keyframes: `
      @keyframes steel-spark { 0%{transform:scale(1.3);opacity:1} 40%{transform:scale(.3);opacity:0} 41%{transform:translateX(var(--sx)) translateY(var(--sy)) scale(0);opacity:0} 68%{opacity:.95} 100%{transform:translateX(var(--sx)) translateY(var(--sy)) scale(.05);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:18},()=>{ const sz=2+rng()*6; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${4+rng()*90}%`,top:`${5+rng()*88}%`,background:rng()>.5?"#f8fafc":"#94a3b8",boxShadow:`0 0 ${sz*2}px #e2e8f0,0 0 ${sz*4}px #94a3b8`,animation:`steel-spark ${0.6+rng()*1.4}s ease ${rng()*5}s infinite`,"--sx":`${(rng()-.5)*55}px`,"--sy":`${(rng()-.5)*45}px` }};});
    },
  },
  flying: {
    keyframes: `
      @keyframes wind-streak { 0%{transform:translateY(0) translateX(0) scaleX(0.5);opacity:0} 15%{opacity:.4;transform:scaleX(1)} 88%{opacity:.4} 100%{transform:translateY(220px) translateX(var(--sx)) scaleX(0.6);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:12},()=>{ const w=18+rng()*35,h=w*0.16; return { style:{ position:"absolute",width:`${w}px`,height:`${h}px`,borderRadius:"50%",left:`${3+rng()*80}%`,top:`${5+rng()*78}%`,background:`rgba(${rng()>.5?200:220},235,255,.5)`,filter:"blur(1.5px)",animation:`wind-streak ${3.5+rng()*5}s ease-in-out ${rng()*6}s infinite`,"--sx":`${(rng()-.5)*60}px` }};});
    },
  },
  ground: {
    keyframes: `
      @keyframes dust-bounce { 0%{transform:translateY(0);opacity:.72} 38%{transform:translateY(-25px)} 72%{transform:translateY(0)} 88%{opacity:.72} 100%{transform:translateY(-8px);opacity:.15} }
    `,
    build: (rng) => {
      return Array.from({length:14},()=>{ const sz=3+rng()*10,cols=["#d97706","#b45309","#fcd34d","#92400e"]; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${4+rng()*90}%`,bottom:`${0+rng()*14}%`,background:cols[0|(rng()*cols.length)],boxShadow:`0 0 ${sz*.6}px rgba(180,100,0,.4)`,animation:`dust-bounce ${1+rng()*2.2}s ease-in-out ${rng()*4}s infinite` }};});
    },
  },
  rock: {
    keyframes: `
      @keyframes rock-fall { 0%{transform:translateY(0) rotate(0deg) translateX(0);opacity:.8} 100%{transform:translateY(280px) rotate(var(--rot)) translateX(var(--sx));opacity:0} }
    `,
    build: (rng) => {
      const cols=["#9ca3af","#6b7280","#d1d5db","#78716c","#a8a29e"];
      return Array.from({length:11},()=>{ const sz=6+rng()*14; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz*(0.7+rng()*0.5)}px`,borderRadius:"25%",left:`${4+rng()*90}%`,top:`${-2+rng()*3}%`,background:cols[0|(rng()*cols.length)],boxShadow:"0 2px 4px rgba(0,0,0,.3)",animation:`rock-fall ${2+rng()*3}s ease-in ${rng()*5}s infinite`,"--rot":`${180+rng()*360}deg`,"--sx":`${(rng()-.5)*70}px` }};});
    },
  },
  bug: {
    keyframes: `
      @keyframes bug-swarm { 0%{transform:translate(0,0);opacity:.78} 33%{transform:translate(var(--sx),var(--sy));opacity:.78} 66%{transform:translate(calc(var(--sx)*-.6),calc(var(--sy)*.45));opacity:.78} 100%{transform:translate(0,0);opacity:.78} }
    `,
    build: (rng) => {
      const cols=["#84cc16","#65a30d","#bef264","#4d7c0f","#a3e635"];
      return Array.from({length:16},()=>{ const sz=2.5+rng()*6; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${8+rng()*82}%`,top:`${10+rng()*78}%`,background:cols[0|(rng()*cols.length)],animation:`bug-swarm ${1.8+rng()*3}s ease-in-out ${rng()*4.5}s infinite`,"--sx":`${(rng()-.5)*60}px`,"--sy":`${(rng()-.5)*45}px` }};});
    },
  },
  normal: {
    keyframes: `
      @keyframes sparkle { 0%{transform:scale(0) rotate(0deg);opacity:0} 22%{transform:scale(1.4) rotate(90deg);opacity:var(--op)} 78%{transform:scale(.9) rotate(270deg);opacity:var(--op)} 100%{transform:scale(0) rotate(360deg);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:12},()=>{ const sz=2+rng()*5,op=0.35+rng()*0.3; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${4+rng()*90}%`,top:`${8+rng()*86}%`,background:"#f8fafc",boxShadow:"0 0 6px rgba(255,255,255,.7)",animation:`sparkle ${2.5+rng()*4}s ease-in-out ${rng()*5}s infinite`,"--op":op }};});
    },
  },
  fairy: {
    keyframes: `
      @keyframes fairy-rise { 0%{transform:translateY(0) scale(1);opacity:var(--op)} 100%{transform:translateY(-145px) scale(.1);opacity:0} }
      @keyframes heart-pop  { 0%{transform:scale(0) rotate(-20deg);opacity:0} 20%{transform:scale(1.3) rotate(10deg);opacity:var(--op)} 80%{opacity:var(--op)} 100%{transform:scale(0) rotate(20deg);opacity:0} }
    `,
    build: (rng) => {
      const cols=["#f9a8d4","#fbcfe8","#ec4899","#fce7f3","#fda4af"];
      const dust=Array.from({length:14},()=>{ const sz=3+rng()*9,op=0.7+rng()*0.28,col=cols[0|(rng()*cols.length)]; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${4+rng()*90}%`,bottom:`${2+rng()*22}%`,background:col,boxShadow:`0 0 ${sz*.9}px ${col}`,animation:`fairy-rise ${2+rng()*3.5}s ease-out ${rng()*5}s infinite`,"--op":op }};});
      const hearts=Array.from({length:6},()=>{ const op=0.6+rng()*0.35; return { char:"♡", style:{ position:"absolute",fontSize:`${12+rng()*14}px`,left:`${8+rng()*80}%`,top:`${10+rng()*75}%`,color:"#f472b6",textShadow:"0 0 10px rgba(240,100,180,.7)",animation:`heart-pop ${2+rng()*3}s ease-in-out ${rng()*5}s infinite`,"--op":op,userSelect:"none" }};});
      return [...dust,...hearts];
    },
  },
  fighting: {
    keyframes: `
      @keyframes shockwave { 0%{transform:scale(.15);opacity:.6} 100%{transform:scale(4.5);opacity:0} }
    `,
    build: (rng) => {
      return Array.from({length:9},()=>{ const sz=16+rng()*38; return { style:{ position:"absolute",width:`${sz}px`,height:`${sz}px`,borderRadius:"50%",left:`${24+rng()*48}%`,top:`${24+rng()*48}%`,border:`2px solid rgba(220,38,38,${0.4+rng()*.3})`,boxShadow:`0 0 10px rgba(220,38,38,.4)`,animation:`shockwave ${1+rng()*1.8}s ease-out ${rng()*4}s infinite` }};});
    },
  },
};

function CSSEffect({ type }) {
  const cfg = CSS_EFFECTS[type];
  const items = useMemo(() => {
    if (!cfg) return [];
    const rng = mkRng(seedFrom(type));
    return cfg.build(rng);
  }, [type]);
  if (!cfg || !items.length) return null;
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:1}}>
      <style>{cfg.keyframes}</style>
      {items.map((p, i) =>
        p.char
          ? <div key={i} style={p.style}>{p.char}</div>
          : <div key={i} style={p.style}/>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Root export
// ═══════════════════════════════════════════════════════════
export default function TypeParticles({ types }) {
  const t = types?.[0]?.type?.name;
  if (!t) return null;
  switch (t) {
    case "fire":     return <FireEffect />;
    case "water":    return <WaterEffect />;
    case "electric": return <ElectricEffect />;
    case "ghost":    return <GhostEffect />;
    case "psychic":  return <PsychicEffect />;
    default:         return <CSSEffect type={t} />;
  }
}
