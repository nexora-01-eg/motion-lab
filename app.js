/* 100 — live wall engine. One loop, visible cells only. */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR=Math.min(devicePixelRatio||1,1.25), CW=300, CH=150;

/* loader */
(()=>{const l=$('#loader'),f=$('#loadfill'),t=$('#loadtxt');let p=0;
const iv=setInterval(()=>{p=Math.min(100,p+11+Math.random()*15);f.style.width=p+'%';t.textContent=p+' / 100';
if(p>=100){clearInterval(iv);setTimeout(()=>l.classList.add('done'),300);build();}},110);})();

/* cursor */
(()=>{const c=$('#cursor');if(!matchMedia('(hover:hover)').matches)return;
addEventListener('mousemove',e=>{c.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;},{passive:true});
document.addEventListener('mouseover',e=>{c.classList.toggle('big',!!(e.target.closest&&e.target.closest('.cell')));});})();

/* seeded rand */
function RNG(seed){let a=seed*1000|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* 3D helpers */
function rot(p,ax,ay){let[x,y,z]=p;const cx=Math.cos(ax),sx=Math.sin(ax);y=y*cx-z*sx;z=y*sx+z*cx;
const cy=Math.cos(ay),sy=Math.sin(ay);const nx=x*cy+z*sy,nz=-x*sy+z*cy;return[nx,y,nz];}
function proj(p,W,H,fl){const s=fl/(fl+p[2]);return[W/2+p[0]*s,H/2+p[1]*s,s];}

/* ---- 16 effect engines ---- */
const FX=[
function cube(ctx,W,H,t,P){ // 0 wireframe cube
 const V=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
 const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
 const a=t*P.speed+P.sp*6.28,b=t*.7*P.speed;
 ctx.strokeStyle=`hsl(${P.hue},75%,60%)`;ctx.lineWidth=1.4;ctx.beginPath();
 E.forEach(([i,j])=>{const p1=proj(rot(V[i],a,b).map(v=>v*34),W,H,300),p2=proj(rot(V[j],a,b).map(v=>v*34),W,H,300);
 ctx.moveTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);});ctx.stroke();},
function torus(ctx,W,H,t,P){ // 1 torus rings
 ctx.strokeStyle=`hsl(${P.hue},75%,60%)`;ctx.lineWidth=1.2;
 for(let k=0;k<3;k++){ctx.beginPath();const R=52-k*13,a=t*P.speed*(1+k*.3)+P.seed;
 for(let i=0;i<=40;i++){const th=i/40*6.28;
 const p=proj(rot([Math.cos(th)*R,Math.sin(th)*R*.42,Math.sin(th+k)*8],a*.4,a),W,H,320);
 i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}},
function spherePts(ctx,W,H,t,P){ // 2 particle globe
 ctx.fillStyle=`hsl(${P.hue},75%,62%)`;
 for(let i=0;i<70;i++){const th=P.rx()*6.28,ph=Math.acos(2*P.rx()-1);
 const p=proj(rot([52*Math.sin(ph)*Math.cos(th),52*Math.sin(ph)*Math.sin(th),52*Math.cos(ph)],t*.5*P.speed,t*.3*P.speed),W,H,300);
 const s=Math.max(.5,p[2]*2.4);ctx.fillRect(p[0],p[1],s,s);}},
function warp(ctx,W,H,t,P){ // 3 star warp
 ctx.strokeStyle=`hsl(${P.hue},80%,65%)`;ctx.lineWidth=1.2;
 for(let i=0;i<46;i++){const a=P.rx()*6.28;let r=((t*90*P.speed+P.rx()*200)%200);
 const x1=W/2+Math.cos(a)*r*.4,y1=H/2+Math.sin(a)*r*.4,x2=W/2+Math.cos(a)*r,y2=H/2+Math.sin(a)*r;
 ctx.globalAlpha=Math.min(1,r/90);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
 ctx.globalAlpha=1;},
function iso(ctx,W,H,t,P){ // 4 isometric dot field
 for(let gx=0;gx<11;gx++)for(let gy=0;gy<7;gy++){
 const x=(gx-5)*22+(gy%2)*11,y=(gy-3)*20;
 const w=Math.sin(t*2*P.speed+gx*.7+gy*.9+P.sp*6.28);
 ctx.fillStyle=`hsla(${P.hue},70%,${45+w*22}%,1)`;
 ctx.beginPath();ctx.arc(W/2+x,H/2+y*.7,2.4+w*1.4,0,7);ctx.fill();}},
function helix(ctx,W,H,t,P){ // 5 double helix
 for(const off of[0,Math.PI]){ctx.strokeStyle=`hsla(${P.hue+(off?40:0)},75%,60%,.9)`;ctx.lineWidth=2;ctx.beginPath();
 for(let i=0;i<=40;i++){const y=(i/40-.5)*130,th=i*.42+t*2*P.speed;
 const p=proj([Math.cos(th+off)*44,y,Math.sin(th+off)*44],W,H,380);
 i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}},
function rings(ctx,W,H,t,P){ // 6 gyro rings
 ctx.lineWidth=1.4;
 for(let k=0;k<4;k++){ctx.strokeStyle=`hsla(${P.hue+k*14},75%,60%,.9)`;ctx.beginPath();
 const a=t*(.5+k*.25)*P.speed+P.sp*3;
 for(let i=0;i<=36;i++){const th=i/36*6.28;
 const p=proj(rot([Math.cos(th)*58,0,Math.sin(th)*58],a,k*1.1),W,H,340);
 i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);}ctx.stroke();}},
function fountain(ctx,W,H,t,P){ // 7 particle fountain
 P.ps=P.ps||[];if(P.ps.length<70&&Math.random()<.6)P.ps.push({x:W/2,y:H,vx:(Math.random()-.5)*3,vy:-4-Math.random()*3,l:1});
 ctx.fillStyle=`hsl(${P.hue},80%,60%)`;
 P.ps.forEach(p=>{p.vy+=.12;p.x+=p.vx;p.y+=p.vy;p.l-=.008;
 if(p.l>0){ctx.globalAlpha=Math.max(0,p.l);ctx.fillRect(p.x,p.y,2.4,2.4);}});
 P.ps=P.ps.filter(p=>p.l>0&&p.y<H+10);ctx.globalAlpha=1;},
function flow(ctx,W,H,t,P){ // 8 flow field
 ctx.strokeStyle=`hsla(${P.hue},75%,60%,.55)`;ctx.lineWidth=1.1;
 for(let i=0;i<40;i++){let x=P.rx()*W,y=P.rx()*H;ctx.beginPath();ctx.moveTo(x,y);
 for(let s=0;s<7;s++){const a=Math.sin(x*.03+t*P.speed)+Math.cos(y*.03-t*.7*P.speed);
 x+=Math.cos(a)*7;y+=Math.sin(a)*7;ctx.lineTo(x,y);}ctx.stroke();}},
function waves(ctx,W,H,t,P){ // 9 wave lines
 for(let r=0;r<6;r++){ctx.strokeStyle=`hsla(${P.hue},70%,${50+r*4}%,.9)`;ctx.lineWidth=1.6;ctx.beginPath();
 for(let x=0;x<=W;x+=6){const y=H/2+Math.sin(x*.045+t*2.2*P.speed+r*.9+P.sp*6.28)*(14+r*7);
 x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}},
function gridpulse(ctx,W,H,t,P){ // 10 reveal grid
 const n=9;for(let gx=0;gx<n;gx++)for(let gy=0;gy<5;gy++){
 const w=(Math.sin(t*2*P.speed+(gx+gy)*.8+P.sp*6.28)+1)/2;
 ctx.fillStyle=`hsla(${P.hue},75%,${30+w*35}%,1)`;
 ctx.fillRect(14+gx*((W-28)/n),14+gy*((H-28)/5),(W-28)/n-5,(H-28)/5-5);}},
function spiral(ctx,W,H,t,P){ // 11 spiral galaxy
 for(let i=0;i<130;i++){const r=Math.sqrt(P.rx())*70,a=P.rx()*6.28+t*P.speed*(1.2-r/90);
 const x=W/2+Math.cos(a)*r,y=H/2+Math.sin(a)*r*.6;
 ctx.fillStyle=`hsla(${P.hue+P.rx()*30},80%,${55+P.rx()*20}%,.9)`;
 ctx.fillRect(x,y,2,2);}},
function sonar(ctx,W,H,t,P){ // 12 sonar ping
 const cyc=(t*.5*P.speed+P.sp)%1;
 for(let k=0;k<3;k++){const r=((cyc+k/3)%1)*95;
 ctx.strokeStyle=`hsla(${P.hue},80%,60%,${(1-r/95)*.9})`;ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(W/2,H/2,r,0,7);ctx.stroke();}
 ctx.fillStyle=`hsl(${P.hue},80%,65%)`;ctx.beginPath();ctx.arc(W/2,H/2,4,0,7);ctx.fill();},
function eqbars(ctx,W,H,t,P){ // 13 equalizer
 const n=22;for(let i=0;i<n;i++){
 const v=(Math.sin(t*4*P.speed+i*.9+P.sp*9)+Math.sin(t*7*P.speed+i*.4)*.5);
 const h=8+Math.abs(v)*52;
 ctx.fillStyle=`hsl(${P.hue+i*3},80%,58%)`;
 ctx.fillRect(10+i*((W-20)/n),H-12-h,(W-20)/n-4,h);}},
function blob(ctx,W,H,t,P){ // 14 morphing blob
 ctx.fillStyle=`hsla(${P.hue},70%,55%,.85)`;ctx.beginPath();
 for(let i=0;i<=40;i++){const a=i/40*6.28;
 const r=44+Math.sin(a*3+t*2*P.speed)*12+Math.sin(a*5-t*1.3*P.speed)*8;
 const x=W/2+Math.cos(a)*r,y=H/2+Math.sin(a)*r*.8;
 i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();},
function rain(ctx,W,H,t,P){ // 15 golden rain
 P.d=P.d||[];if(P.d.length<50)P.d.push({x:Math.random()*W,y:-10,v:2+Math.random()*4,l:40+Math.random()*40});
 ctx.strokeStyle=`hsla(${P.hue},85%,62%,.8)`;ctx.lineWidth=1.3;ctx.beginPath();
 P.d.forEach(d=>{d.y+=d.v*P.speed;d.l-=d.v;ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.v*2,d.y-d.v*6);});
 P.d=P.d.filter(d=>d.y<H+12);ctx.stroke();},
function kaleido(ctx,W,H,t,P){ //16
 ctx.save();ctx.translate(W/2,H/2);const N=10;
 for(let k=0;k<N;k++){ctx.save();ctx.rotate(k/N*6.28+t*.3*P.speed);
 ctx.strokeStyle=`hsla(${P.hue+k*12},80%,60%,.8)`;ctx.lineWidth=2;ctx.beginPath();
 ctx.arc(0,0,30+((t*20*P.speed+k*17)%60),0,1.1);ctx.stroke();ctx.restore();}ctx.restore();},
function tunnel(ctx,W,H,t,P){ //17
 ctx.strokeStyle=`hsl(${P.hue},75%,60%)`;ctx.lineWidth=1.6;
 for(let i=0;i<10;i++){const p=((t*.4*P.speed+i/10)%1),s=p*p,r=s*Math.min(W,H)*.48;
 ctx.globalAlpha=.15+p*.75;ctx.strokeRect(W/2-r,H/2-r*.6,r*2,r*1.2);}ctx.globalAlpha=1;},
function plasma(ctx,W,H,t,P){ //18
 for(let y=0;y<H;y+=8){const l=42+Math.sin(y*.09+t*2*P.speed)*22+Math.sin(y*.023-t*1.2*P.speed)*14;
 ctx.fillStyle=`hsl(${P.hue+y*.25},75%,${l}%)`;ctx.fillRect(0,y,W,8);}},
function fireworks(ctx,W,H,t,P){ //19
 P.fw=P.fw||[];if(Math.random()<.05*P.speed)P.fw.push({x:W*.2+Math.random()*W*.6,y:H,vy:-(4+Math.random()*3),parts:null});
 ctx.fillStyle=`hsl(${P.hue},85%,65%)`;
 P.fw.forEach(f=>{if(!f.parts){f.y+=f.vy;f.vy+=.08;
  if(f.vy>-1){f.parts=[];for(let i=0;i<26;i++){const a=Math.random()*6.28,v=1+Math.random()*2.5;
  f.parts.push({x:f.x,y:f.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1});}}}
  else{f.parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.l-=.015;
  if(p.l>0){ctx.globalAlpha=Math.max(0,p.l);ctx.fillRect(p.x,p.y,2.4,2.4);}});}});
 P.fw=P.fw.filter(f=>!f.parts||f.parts.some(p=>p.l>0));ctx.globalAlpha=1;},
function matrix(ctx,W,H,t,P){ //20
 P.mc=P.mc||[];const n=Math.floor(W/14);
 while(P.mc.length<n)P.mc.push({x:P.mc.length*14,y:Math.random()*H,v:1+Math.random()*3});
 ctx.fillStyle=`hsla(${P.hue},90%,55%,.9)`;
 P.mc.forEach(c=>{c.y+=c.v*P.speed;if(c.y>H+14){c.y=-14;}
 for(let k=0;k<5;k++){ctx.globalAlpha=Math.max(0,.9-k*.2);ctx.fillRect(c.x,c.y-k*11,7,8);}});
 ctx.globalAlpha=1;},
function terrain(ctx,W,H,t,P){ //21
 for(let L=0;L<3;L++){ctx.fillStyle=`hsla(${P.hue+L*16},60%,${18+L*12}%,.95)`;ctx.beginPath();ctx.moveTo(0,H);
 for(let x=0;x<=W;x+=8){const y=H*.35+L*22+Math.sin(x*.03+t*(.5+L*.3)*P.speed+L*2)*16+Math.sin(x*.011-t*.4*P.speed)*10;
 ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fill();}},
function ribbon(ctx,W,H,t,P){ //22
 ctx.lineWidth=9;ctx.lineCap='round';
 for(let x=0;x<W;x+=4){const y=H/2+Math.sin(x*.05+t*2.4*P.speed+P.sp*6.28)*34+Math.sin(x*.013-t*P.speed)*12;
 ctx.strokeStyle=`hsl(${P.hue+x*.4},85%,60%)`;ctx.beginPath();ctx.moveTo(x,y);
 ctx.lineTo(x+4,H/2+Math.sin((x+4)*.05+t*2.4*P.speed+P.sp*6.28)*34+Math.sin((x+4)*.013-t*P.speed)*12);ctx.stroke();}},
function starburst(ctx,W,H,t,P){ //23
 ctx.save();ctx.translate(W/2,H/2);
 for(let i=0;i<24;i++){const a=i/24*6.28+t*.4*P.speed;
 const r1=14+Math.sin(t*3+i)*6,r2=70+Math.cos(t*2+i*1.3)*26;
 ctx.strokeStyle=`hsla(${P.hue+i*6},85%,62%,.85)`;ctx.lineWidth=2.4;
 ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);ctx.stroke();}
 ctx.restore();},
function boids(ctx,W,H,t,P){ //24 flocking: separation+alignment+cohesion
 P.b=P.b||[];const N=24;
 if(!P.b.length)for(let i=0;i<N;i++)P.b.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2});
 const B=P.b;
 B.forEach(b=>{let ax=0,ay=0,nx=0,ny=0,cx=0,cy=0,n=0;
  B.forEach(o=>{if(o===b)return;const dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy);
  if(d<46&&d>.1){ax+=dx/d*(46-d)*.02;ay+=dy/d*(46-d)*.02;}
  if(d<80){nx+=o.vx;ny+=o.vy;cx+=o.x;cy+=o.y;n++;}});
  if(n){ax+=(nx/n-b.vx)*.06+(cx/n-b.x)*.004;ay+=(ny/n-b.vy)*.06+(cy/n-b.y)*.004;}
  b.vx=(b.vx+ax)*.985;b.vy=(b.vy+ay)*.985;b.x+=b.vx;b.y+=b.vy;
  if(b.x<0)b.x+=W;if(b.x>W)b.x-=W;if(b.y<0)b.y+=H;if(b.y>H)b.y-=H;});
 ctx.fillStyle=`hsl(${P.hue},80%,62%)`;
 B.forEach(b=>{const a=Math.atan2(b.vy,b.vx);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(a);
 ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,3.4);ctx.lineTo(-4,-3.4);ctx.closePath();ctx.fill();ctx.restore();});},
function flowTrails(ctx,W,H,t,P){ //25 curl-style flow followers
 P.trail=1;P.f=P.f||[];if(P.f.length<70)P.f.push({x:Math.random()*W,y:Math.random()*H});
 ctx.strokeStyle=`hsla(${P.hue},80%,60%,.5)`;ctx.lineWidth=1.2;ctx.beginPath();
 P.f.forEach(f=>{const a=Math.sin(f.x*.03+t)+Math.cos(f.y*.03-t*.7)+P.sp*3;
 const nx=f.x+Math.cos(a)*4,ny=f.y+Math.sin(a)*4;
 ctx.moveTo(f.x,f.y);ctx.lineTo(nx,ny);f.x=nx;f.y=ny;
 if(f.x<0||f.x>W||f.y<0||f.y>H){f.x=Math.random()*W;f.y=Math.random()*H;}});ctx.stroke();},
function tendrils(ctx,W,H,t,P){ //26 emergent walkers
 P.trail=1;P.w=P.w||[];if(!P.w.length)for(let i=0;i<5;i++)P.w.push({x:W/2,y:H/2,a:Math.random()*6.28});
 ctx.lineWidth=1.6;
 P.w.forEach((w,i)=>{w.a+=Math.sin(w.x*.02+t+i)*.3+Math.cos(w.y*.02-t*.8)*.2;
 w.x+=Math.cos(w.a)*2.2;w.y+=Math.sin(w.a)*2.2;
 if(w.x<0||w.x>W||w.y<0||w.y>H){w.x=W/2;w.y=H/2;}
 ctx.strokeStyle=`hsla(${P.hue+i*18},85%,62%,.8)`;ctx.beginPath();
 ctx.moveTo(w.x,w.y);ctx.lineTo(w.x-Math.cos(w.a)*2.2,w.y-Math.sin(w.a)*2.2);ctx.stroke();});},
function galaxy(ctx,W,H,t,P){ //27 spiral collapse
 P.g=P.g||[];if(!P.g.length)for(let i=0;i<200;i++){const r=8+Math.random()*80,a=Math.random()*6.28;
 P.g.push({x:W/2+Math.cos(a)*r,y:H/2+Math.sin(a)*r*.6,vx:0,vy:0});}
 P.g.forEach(p=>{const dx=W/2-p.x,dy=H/2-p.y,d=Math.hypot(dx,dy)+8;
 p.vx+=dx/d*1.1/(d*.06+2);p.vy+=dy/d*1.1/(d*.06+2);
 p.vx+=-dy/d*.06;p.vy+=dx/d*.06;p.vx*=.995;p.vy*=.995;p.x+=p.vx;p.y+=p.vy;});
 ctx.fillStyle=`hsl(${P.hue},80%,65%)`;
 P.g.forEach(p=>ctx.fillRect(p.x,p.y,1.8,1.8));},
function pendulum(ctx,W,H,t,P){ //28 chaos trails
 ctx.lineWidth=1.4;
 for(let k=0;k<3;k++){let a1=1.2+k*.6+t*.06*P.speed,a2=2.4-k*.5,v1=0,v2=0;
 const L1=32,L2=28;ctx.beginPath();ctx.moveTo(W/2,H*.28);
 for(let s=0;s<80;s++){v1+=(-Math.sin(a1)*.02-Math.sin(a1-a2)*.005);v2+=(-Math.sin(a2)*.02);
 a1+=v1;a2+=v2;
 const x2=W/2+Math.sin(a1)*L1+Math.sin(a2)*L2,y2=H*.28+Math.cos(a1)*L1+Math.cos(a2)*L2;
 ctx.lineTo(x2,y2);}
 ctx.strokeStyle=`hsla(${P.hue+k*22},82%,62%,.85)`;ctx.stroke();}},
function lorenz(ctx,W,H,t,P){ //29 strange attractor
 P.trail=1;P.l=P.l||{x:.1,y:0,z:0};const p=P.l;
 ctx.strokeStyle=`hsl(${(P.hue+t*20)%360},85%,62%)`;ctx.lineWidth=1.3;ctx.beginPath();
 let sx=p.x,sy=p.y,sz=p.z;const dt=.008;
 for(let i=0;i<70;i++){for(let s=0;s<6;s++){const dx=10*(sy-sx),dy=sx*(28-sz)-sy,dz=sx*sy-8/3*sz;
 sx+=dx*dt;sy+=dy*dt;sz+=dz*dt;}
 const X=W/2+sx*4.6,Y=H/2+14-sz*3.6;
 i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
 ctx.stroke();p.x=sx;p.y=sy;p.z=sz;},
function goo(ctx,W,H,t,P){ //30 glowing blobs
 P.mx=P.mx??W/2;P.my=P.my??H/2;
 for(let i=0;i<5;i++){const a=t*(.4+i*.13)*P.speed+i*2.1;
 const x=W/2+Math.cos(a)*(W*.24)+(P.mx-W/2)*.3*(i===0?1:0);
 const y=H/2+Math.sin(a*1.3)*(H*.24)+(P.my-H/2)*.3*(i===0?1:0);
 const r=(26-i*3)*(1+Math.sin(t*2+i)*.12);
 const g=ctx.createRadialGradient(x,y,1,x,y,r*2.4);
 g.addColorStop(0,`hsla(${P.hue+i*14},85%,60%,.85)`);g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*2.4,0,7);ctx.fill();}},
function constellation(ctx,W,H,t,P){ //31 linked stars
 P.c=P.c||[];if(!P.c.length)for(let i=0;i<38;i++)P.c.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.7,vy:(Math.random()-.5)*.7});
 P.c.forEach(p=>{p.x+=p.vx*P.speed;p.y+=p.vy*P.speed;
 if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;});
 ctx.lineWidth=1;
 P.c.forEach((a,i)=>P.c.forEach((b,j)=>{if(j<=i)return;const d=Math.hypot(a.x-b.x,a.y-b.y);
 if(d<52){ctx.strokeStyle=`hsla(${P.hue},70%,60%,${(1-d/52)*.6})`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}));
 ctx.fillStyle=`hsl(${P.hue},80%,68%)`;
 P.c.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,7);ctx.fill();});},
function tree(ctx,W,H,t,P){ //32 growing fractal tree
 ctx.strokeStyle=`hsl(${P.hue},60%,55%)`;ctx.lineWidth=1.6;ctx.beginPath();
 const grow=.55+.45*Math.abs(Math.sin(t*.3*P.speed+P.sp*3));
 (function br(x,y,a,l,d){if(d<=0||l<4)return;
 const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;ctx.moveTo(x,y);ctx.lineTo(x2,y2);
 const nl=l*.74;
 br(x2,y2,a-.45+Math.sin(t*1.5+d)*.07,nl*grow+.01,d-1);
 br(x2,y2,a+.5+Math.cos(t+d)*.06,nl*grow+.01,d-1);})(W/2,H-6,-Math.PI/2,Math.min(W,H)*.27,8);
 ctx.stroke();},
function jelly(ctx,W,H,t,P){ //33 spring mesh + mouse
 P.mx=P.mx??W/2;P.my=P.my??H/2;
 const N=8,M=6,G=[];
 for(let gy=0;gy<M;gy++){G[gy]=[];for(let gx=0;gx<N;gx++){
 const bx=24+gx*((W-48)/(N-1)),by=20+gy*((H-40)/(M-1));
 const dx=bx-P.mx,dy=by-P.my,d=Math.hypot(dx,dy)+1;
 const push=Math.max(0,1-d/110)*26,wob=Math.sin(t*3+gx+gy*1.4)*3;
 G[gy][gx]=[bx+dx/d*push,by+wob+dy/d*push*.5];}}
 ctx.strokeStyle=`hsla(${P.hue},70%,60%,.4)`;ctx.lineWidth=1;ctx.beginPath();
 for(let gy=0;gy<M;gy++)for(let gx=0;gx<N-1;gx++){ctx.moveTo(G[gy][gx][0],G[gy][gx][1]);ctx.lineTo(G[gy][gx+1][0],G[gy][gx+1][1]);}
 for(let gx=0;gx<N;gx++)for(let gy=0;gy<M-1;gy++){ctx.moveTo(G[gy][gx][0],G[gy][gx][1]);ctx.lineTo(G[gy+1][gx][0],G[gy+1][gx][1]);}
 ctx.stroke();
 ctx.fillStyle=`hsl(${P.hue},80%,65%)`;
 G.flat().forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],2.4,0,7);ctx.fill();});}
];

/* ---- 100 names ---- */
const N3D="Wireframe Cube,Torus Knot,Particle Sphere,Star Warp,Iso Field,Glass Torus,Helix Rise,Cube Rain,Orbit System,Prism Spin,Vortex Cone,Double Helix,Wave Surface,Pixel Globe,Neon Tetra,Gyro Rings,Solar Drift,Asteroid Belt,Cube Tunnel,Plasma Orb,Crystal Lattice,Mobius Flow,Satellite Swarm,Depth Grid,Holo Pyramid,Ring Storm,Axis Spin,Nebula Core,Quantum Dots,Zero Gravity".split(',');
const NSC="Progress Dial,Reveal Wipe,Parallax Stack,Scrub Rotate,Skew Rush,Pin Zoom,Scrub Morph,Fade Cascade,Velocity Lines,Anchor Drift,Chapter Bars,Scrub Orbit,Clip Rise,Depth Scroll,Tilt Flow,Horizon Shift,Scrub Pulse,Sticky Bloom,Scroll Comet,Phase Shift,Damped Trail,Scrub Wave,Edge Glow,Scroll Sonar,Inertia Spin".split(',');
const NCI="Letterbox,Film Grain,Light Leak,Vignette Pulse,Golden Hour,Blue Hour,Ember Rise,Dust Motes,Fog Bank,Lens Flare,Anamorphic,Bokeh Drift,Candle Flicker,Neon Wash,Moon Glow,Star Trails,Haze Bloom,Smoke Curl,Timecode,Countdown Leader,Reel End,Fade In-Out,Cross Dissolve,Slow Push,Pull Back".split(',');
const NTR="Morph Cut,Liquid Wipe,Zoom Through,Curtain Rise,Iris Open,Page Curl,Pixel Dissolve,Glitch Cut,Smooth Mask,Slide Reveal,Circle Expand,Diamond Wipe,Venetian Blind,Door Split,Ripple Pass,Shutter Snap,Fold Away,Spin Door,Soft Blend,Hard Cut".split(',');
const FXMAP={ '3d':[0,1,2,3,4,5,7,8,13,6,24,27,29,31],scroll:[12,10,9,0,5,13,25,33],cine:[6,15,4,11,14,3,26,30,32],trans:[12,14,11,9,10,2,16,17,28]};

/* ---- build ---- */
const tiles=[];
function build(){
 const grid=$('#grid');let n=0;
 const add=(name,cat)=>{n++;
  const map=FXMAP[cat],fx=map[(n-1)%map.length];
  const hue=(n*47)%360, speed=.6+((n*37)%100)/100*1.1, seed=n*13.7;
  const el=document.createElement('article');el.className='cell';el.dataset.cat=cat;el.dataset.name=name.toLowerCase();
  el.innerHTML=`<canvas width="${CW*DPR}" height="${CH*DPR}"></canvas>
  <div class="meta"><b>${String(n).padStart(3,'0')}</b><h3>${name}</h3><span>${cat.toUpperCase()}</span></div>`;
  grid.appendChild(el);
  const cv=el.querySelector('canvas'),ctx=cv.getContext('2d');ctx.scale(DPR,DPR);
  tiles.push({n,el,cv,ctx,fx,P:{hue,speed,seed,rx:RNG(seed),sp:0,hov:0},visible:false,hidden:false});
  el.addEventListener('mouseenter',()=>tiles[n-1].P.hov=1);
  el.addEventListener('mouseleave',()=>tiles[n-1].P.hov=0);
  el.addEventListener('click',()=>{const T=tiles[n-1];T.P.seed=Math.random()*1000;T.P.rx=RNG(T.P.seed);T.P.ps=null;T.P.d=null;});};
 N3D.forEach(x=>add(x,'3d'));NSC.forEach(x=>add(x,'scroll'));NCI.forEach(x=>add(x,'cine'));NTR.forEach(x=>add(x,'trans'));
 const io=new IntersectionObserver(es=>es.forEach(e=>{
  const T=tiles.find(t=>t.el===e.target);if(T)T.visible=e.isIntersecting;}),{rootMargin:'100px'});
 tiles.forEach(t=>io.observe(t.el));
 $('#showCount').textContent='100';
 requestAnimationFrame(loop);
}

/* filters + search */
let filt='all',q='';
$('#filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
filt=b.dataset.f;$$('#filters button').forEach(x=>x.classList.toggle('on',x===b));apply();});
$('#search').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();apply();});
function apply(){let n=0;tiles.forEach(t=>{const ok=(filt==='all'||t.el.dataset.cat===filt)&&(!q||t.el.dataset.name.includes(q));
t.hidden=!ok;t.el.classList.toggle('hide',!ok);if(ok)n++;});$('#showCount').textContent=n;}

/* main loop — visible only */
const t0=performance.now();
function loop(){requestAnimationFrame(loop);
 if(reduced)return;const t=(performance.now()-t0)/1000;let live=0;
 const vh=innerHeight;
 for(const T of tiles){if(!T.visible||T.hidden||!T.ctx)continue;live++;
  const r=T.el.getBoundingClientRect();
  T.P.sp=Math.max(0,Math.min(1,1-(r.top+r.height/2)/(vh*1.1)));
  const c=T.ctx,W=T.cw||CW,H=T.ch||CH;
  if(T.P.trail){c.fillStyle='rgba(10,9,8,.16)';c.fillRect(0,0,W,H);}else c.clearRect(0,0,W,H);
  c.save();if(T.P.hov){const b=1+Math.sin(t*6)*.03;c.translate(W/2,H/2);c.scale(b,b);c.translate(-W/2,-H/2);}
  FX[T.fx](c,W,H,t*(T.P.hov?2.2:1),T.P);c.restore();}
 $('#liveCount').textContent=live;}

/* ---- 200 full-screen experiences ---- */
const F3D="Magma Core,Ice Shard,Smoke Ring,Mirror Maze,Gravity Well,Photon Jet,Dark Matter,Solar Flare,Lunar Tide,Comet Tail,Ion Storm,Plasma Arc,Fusion Pulse,Quasar Beam,Pulsar Blink,Event Horizon,Wormhole,Time Dilation,Light Cone,Shadow Play,Mirror Cube,Glass Storm,Chrome Wave,Liquid Metal,Molten Gold,Frozen Smoke,Electric Ivy,Neon Roots,Data Tree,Cloud Chamber,Ember Field,Frost Bite,Storm Eye, Ash Fall,Coal Glow,Prism Break,Spectrum Drift,Halo Ring,Corona Kiss,Vapor Trail,Mistral Wind,Sirocco Heat,Monsoon Rush,Aurora Veil,Polar Night,Desert Mirage,Oasis Shimmer,Dune Song,Canyon Echo,Tide Pull".split(',');
const FSC="Scrub Bloom,Wheel Zoom,Delta Skew,Momentum Trail,Friction Glow,Elastic Edge,Snap Back,Overshoot,Settle Down,Scroll Jack,Hijack Lane,Smooth Criminal,Lerp Dance,Ease Party,Curve Ball,Gravity Scroll,Orbit Page,Tilt World,Pan Soul,Dolly Heart,Crane Mind,Gimbal Soul,Slider Spirit,Track Passion,Jib Joy,Focus Rack,Whip Scroll,Glide Path,Drift Mode,Float State,Sink Feel,Rise Mood,Stretch Time,Squeeze Play,Bounce House,Rubber Soul,Spring Loaded,Damper Calm,Stagger Walk,Cascade Run,Waterfall Down,Ladder Up,Staircase Wit,Elevator Calm,Escalator Rush,Conveyor Flow,Treadmill Calm,River Run,Ocean Swell".split(',');
const FCI="Match Frame,Killer Light,Soft Shadow,Hard Shadow,Practical Magic,Motivated Source,Bounce Heaven,Negative Fill,Silk Diffusion,Grid Spot,Fresnel Soul,HMI Punch,Tungsten Warm,Daylight Cold,Sodium Night,Fluorescent Hum,Candle Dance,Firelight Tale,Torch Pass,Lantern Glow,Porch Light,Street Lamp,Headlight Sweep,Taillight Trail,Marquee Chase,Neon Confession,Velvet Hour,Satin Glow,Silk Hour,Paper Moon,Cardboard Sun,Tinfoil Star,Chrome Dream,Mirror Hour,Glass Noon,Crystal Dusk,Prism Dawn,Opal Afternoon,Jade Evening,Ruby Night,Sapphire Calm,Emerald Rush,Amber Drift,Topaz Glow,Onyx Calm,Pearl Soft,Coral Warm,Ivory Calm,Sand Drift".split(',');
const FTR="Whip Zoom,Crash Cut,Invisible Wipe,Split Depth,Slide Stack,Push Katana,Spin Blur,Swirl Exit,Droplet Pass,Ink Bleed,Paper Tear,Burn Through,Melt Away,Freeze Pop,Echo Trail,Stutter Step,Frame Skip,Ghost Frame,Trail Mix,Light Sweep,Prism Pass,Color Flood,Mono Burst,Duo Tone,Tri Split,Quad Crush,Slice Dice,Shatter Glass,Fold Paper,Unfold Dawn,Roll Credits,Cut Back,Flash Frame,Smash Zoom,Dive In,Surface Up,Plunge Down,Soar High,Sink Low,Drift Off,Float On,Hover Calm,Levitate Soft,Descend Slow,Ascend Fast,Circle Back,Loop Eternal,Endless Return,Final Bow".split(',');
(function buildFull(){
 let fn=100;
 [['3d',F3D],['scroll',FSC],['cine',FCI],['trans',FTR]].forEach(([cat,arr])=>arr.forEach(name=>{
  fn++;const SPREAD=[0,24,9,27,3,30,12,25,6,31,1,28,14,26,7,32,2,29,10,33,4,25,8,27,13,31,5,26,15,29,11,33,17,24];
  const fx=SPREAD[fn%34],hue=(fn*47)%360,speed=.6+((fn*37)%100)/100*1.1,seed=fn*13.7;
  const sec=document.createElement('section');sec.className='xp L'+((fn%3)+1);
  sec.dataset.cat=cat;sec.dataset.name=name.toLowerCase();
  sec.innerHTML=`<div class="xp-meta"><b>${fn}</b><h2>${name}</h2><span>${cat.toUpperCase()} — SCROLL DRIVES THIS · CLICK TO RE-SEED</span></div>`;
  $('#fullList').appendChild(sec);
  const T={n:fn,el:sec,cv:null,ctx:null,cw:320,ch:180,fx,P:{hue,speed,seed,rx:RNG(seed),sp:0,hov:0},visible:false,hidden:false};
  tiles.push(T);
  sec.addEventListener('mouseenter',()=>T.P.hov=1);
  sec.addEventListener('mouseleave',()=>{T.P.hov=0;T.P.mx=null;});
  sec.addEventListener('mousemove',e=>{const r=sec.getBoundingClientRect();
   T.P.mx=(e.clientX-r.left)/r.width*320;T.P.my=(e.clientY-r.top)/r.height*180;});
  sec.addEventListener('click',()=>{T.P.seed=Math.random()*1000;T.P.rx=RNG(T.P.seed);T.P.ps=null;T.P.d=null;T.P.fw=null;T.P.mc=null;});
 }));
 const nearIO=new IntersectionObserver(es=>es.forEach(e=>{
  const T=tiles.find(t=>t.el===e.target&&t.cw===320);if(!T)return;
  if(e.isIntersecting&&!T.cv){const cv=document.createElement('canvas');cv.width=320;cv.height=180;
   T.el.prepend(cv);T.cv=cv;T.ctx=cv.getContext('2d');}
  else if(!e.isIntersecting&&T.cv){T.cv.remove();T.cv=null;T.ctx=null;T.visible=false;}
 }),{rootMargin:'500px 0px'});
 const visIO=new IntersectionObserver(es=>es.forEach(e=>{
  const T=tiles.find(t=>t.el===e.target);if(T&&T.ctx)T.visible=e.isIntersecting;
 }),{rootMargin:'0px'});
 tiles.forEach(t=>{if(t.cw===320){nearIO.observe(t.el);visIO.observe(t.el);}});
 $('#showCount').textContent=tiles.length;
})();
