(() => {
  'use strict';
  const stage=document.getElementById('stage');
  const actor=document.getElementById('cat-button');
  const canvas=document.getElementById('pet-canvas');
  const status=document.getElementById('pet-state');
  const menu=document.getElementById('pet-menu');
  const menuToggle=document.getElementById('pet-menu-toggle');
  const caption=document.getElementById('stage-caption');
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const CELL_W=192,CELL_H=208;
  const names={idle:'发呆中',look:'看看你',walk:'散个步',wave:'你好呀',happy:'舒服了',sleep:'打盹中',drag:'被拎走了',fall:'轻轻落地',review:'认真看看'};
  const pet={x:0,y:0,size:180,ground:0,minX:0,maxX:0,state:'idle',since:0,until:Infinity,target:0,direction:1,vx:0,vy:0,ready:false,paused:motion.matches,inView:true,visible:!document.hidden,nextWander:0,lastInput:performance.now(),look:1,drag:null};
  const sheets={};
  let width=0,height=0,previous=0,raf=0,lastFrame='',suppressClick=false,paintedX=-1,paintedY=-1,petCount=0,dragRotation=0,afterLanding=null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const emit=(name,detail)=>document.dispatchEvent(new CustomEvent(name,{detail}));
  const speak=(message,duration)=>emit('murphy:pet-say',{message,duration});
  const delayWander=(now=performance.now())=>{pet.nextWander=now+8000+Math.random()*6500;};

  function setState(state,duration=Infinity,now=performance.now()) {
    if(!pet.ready)return;
    if(pet.state==='fall'&&!['fall','drag','walk'].includes(state)&&pet.y<pet.ground-1){afterLanding={state,duration};return;}
    if(state==='drag'||state==='walk'||pet.y>=pet.ground-1)afterLanding=null;
    pet.state=state;
    pet.since=now;
    pet.until=duration===Infinity?Infinity:now+duration;
    status.textContent=names[state]||names.idle;
    actor.dataset.state=state;
    if(state!=='walk'&&state!=='fall'){pet.vx=0;pet.vy=0;}
    if(state==='idle')delayWander(now);
    paint(now);
    ensureLoop();
  }

  function measure(initial=false) {
    const rect=stage.getBoundingClientRect();
    const oldWidth=width||rect.width,oldGround=pet.ground||rect.height*.87;
    width=rect.width;height=rect.height;
    pet.size=clamp(width*.40,150,186);
    pet.ground=height*.86;
    pet.minX=pet.size*.66;
    pet.maxX=width-pet.minX;
    pet.x=initial?width/2:clamp(pet.x/oldWidth*width,pet.minX,pet.maxX);
    pet.y=initial?pet.ground:Math.min(pet.ground,pet.y/oldGround*pet.ground);
    pet.target=clamp(pet.target||pet.x,pet.minX,pet.maxX);
    actor.style.width=(pet.size*CELL_W/CELL_H)+'px';actor.style.height=pet.size+'px';
    paintedX=-1;paintedY=-1;
    position();
  }

  function position() {
    if(Math.abs(paintedX-pet.x)>.1){actor.style.left=pet.x.toFixed(2)+'px';paintedX=pet.x;}
    if(Math.abs(paintedY-pet.y)>.1){actor.style.top=pet.y.toFixed(2)+'px';paintedY=pet.y;}
    actor.style.setProperty('--pet-tilt',dragRotation.toFixed(2)+'deg');
  }

  function frame(now) {
    const elapsed=Math.max(0,now-pet.since);
    if(pet.state==='walk')return [pet.direction<0?2:1,Math.floor(elapsed/95)%8];
    if(pet.state==='look')return [pet.look===0?10:9,2];
    if(pet.state==='review')return [8,Math.floor(elapsed/320)%6];
    if(pet.state==='wave')return [3,Math.floor(elapsed/220)%4];
    if(pet.state==='happy')return [6,Math.floor(elapsed/210)%6];
    if(pet.state==='sleep')return [0,2];
    if(pet.state==='drag')return [4,2];
    if(pet.state==='fall')return [4,3];
    if(motion.matches)return [0,0];
    const phase=elapsed%3800;
    return [0,phase<1850?0:phase<2070?2:phase<2190?3:5];
  }

  function paint(now=performance.now()) {
    if(!pet.ready)return;
    const [row,index]=frame(now);
    const key=row+':'+index;
    if(key===lastFrame)return;
    lastFrame=key;
    ctx.clearRect(0,0,CELL_W,CELL_H);
    ctx.drawImage(sheets.pet,index*CELL_W,row*CELL_H,CELL_W,CELL_H,0,0,CELL_W,CELL_H);
  }

  function walkTo(x,now=performance.now()) {
    if(!pet.ready)return;
    pet.lastInput=now;
    pet.target=clamp(x,pet.minX,pet.maxX);
    if(motion.matches||Math.abs(pet.target-pet.x)<8){
      pet.x=pet.target;pet.y=pet.ground;position();setState('look',800,now);return;
    }
    pet.direction=pet.target>pet.x?1:-1;
    pet.y=pet.ground;
    setState('walk',Infinity,now);
  }

  function tick(now) {
    raf=0;
    if(!pet.ready||!pet.inView||!pet.visible)return;
    const dt=Math.min((now-(previous||now))/1000,.045);
    previous=now;
    if(pet.state==='walk') {
      const distance=pet.target-pet.x;
      const step=61*dt;
      if(Math.abs(distance)<=step+1){pet.x=pet.target;setState('idle',Infinity,now);}
      else {pet.direction=distance>0?1:-1;pet.x+=pet.direction*step;}
    } else if(pet.state==='fall') {
      pet.vy+=1000*dt;pet.x=clamp(pet.x+pet.vx*dt,pet.minX,pet.maxX);pet.y+=pet.vy*dt;
      pet.vx*=Math.pow(.22,dt);
      dragRotation*=Math.max(0,1-dt*10);
      if(pet.y>=pet.ground){pet.y=pet.ground;dragRotation=0;const next=afterLanding;afterLanding=null;setState(next?.state||'happy',next?.duration??700,now);}
    } else if(!pet.drag&&now>=pet.until) {
      setState('idle',Infinity,now);
    } else if(pet.state==='idle'&&!pet.paused&&!motion.matches&&now>=pet.nextWander) {
      if(now-pet.lastInput>55000){setState('sleep',Infinity,now);}
      else {
        const hop=(Math.random()<.5?-1:1)*(42+Math.random()*80);
        const target=clamp(pet.x+hop,pet.minX,pet.maxX);
        if(Math.abs(target-pet.x)<15)delayWander(now);
        else {
          pet.target=target;pet.direction=target>pet.x?1:-1;setState('walk',Infinity,now);
        }
      }
    }
    position();paint(now);
    ensureLoop();
  }

  function ensureLoop() {
    if(raf||!pet.ready||!pet.inView||!pet.visible)return;
    if(motion.matches&&['idle','sleep'].includes(pet.state)&&pet.until===Infinity)return;
    raf=requestAnimationFrame(tick);
  }

  actor.addEventListener('pointerdown',event=>{
    if(event.button!==0||!pet.ready)return;
    closeMenu();
    const now=performance.now();
    pet.lastInput=now;
    pet.drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:pet.x,y:pet.y,moved:false,lastX:event.clientX,lastAt:now};
    actor.setPointerCapture(event.pointerId);
    if(pet.state==='walk'||pet.state==='sleep')setState('look',Infinity,now);
  });

  actor.addEventListener('pointermove',event=>{
    const drag=pet.drag;
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(Math.abs(dx)+Math.abs(dy)>5&&!drag.moved){drag.moved=true;setState('drag');actor.classList.add('picked-up');}
    if(!drag.moved)return;
    const now=performance.now();
    pet.vx=clamp((event.clientX-drag.lastX)/Math.max(.016,(now-drag.lastAt)/1000),-220,220);
    pet.x=clamp(drag.x+dx,pet.minX,pet.maxX);
    pet.y=clamp(drag.y+dy,pet.size*.95,pet.ground);
    dragRotation=motion.matches?0:clamp(pet.vx*.025,-7,7);
    drag.lastX=event.clientX;drag.lastAt=now;
    position();paint(now);
  });

  function release(event) {
    const drag=pet.drag;
    if(!drag||drag.id!==event.pointerId)return;
    const wasMoved=drag.moved;
    pet.drag=null;suppressClick=wasMoved;
    actor.classList.remove('picked-up');
    if(actor.hasPointerCapture(event.pointerId))actor.releasePointerCapture(event.pointerId);
    if(wasMoved){
      caption.textContent='换个位置，继续陪你。';
      if(motion.matches){pet.y=pet.ground;dragRotation=0;position();setState('happy',700);}
      else {pet.vy=0;setState('fall');}
    }else setState('idle');
    if(event.type==='pointercancel')suppressClick=false;
  }
  actor.addEventListener('pointerup',release);
  actor.addEventListener('pointercancel',release);
  actor.addEventListener('lostpointercapture',event=>{if(pet.drag&&pet.drag.id===event.pointerId)release(event);});

  actor.addEventListener('click',event=>{
    if(suppressClick&&event.detail!==0){suppressClick=false;return;}
    pet.lastInput=performance.now();petCount++;
    if(!pet.ready){emit('murphy:pet-tidy');return;}
    pet.y=pet.ground;dragRotation=0;
    setState(petCount%2?'wave':'happy',1250);
    emit('murphy:pet-tidy');
    position();
  });

  actor.addEventListener('contextmenu',event=>{if(!pet.ready)return;event.preventDefault();openMenu();});
  actor.addEventListener('keydown',event=>{
    if(!pet.ready)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();walkTo(pet.x+(event.key==='ArrowLeft'?-65:65));
    }else if(event.key==='ArrowUp'){
      event.preventDefault();pet.lastInput=performance.now();setState('wave',1200);
    }else if(event.key==='ArrowDown'){
      event.preventDefault();setState(pet.state==='sleep'?'idle':'sleep');
    }else if(event.key==='Home'){
      event.preventDefault();goHome();
    }else if(event.key==='Escape'){closeMenu();}
  });

  stage.addEventListener('pointerdown',event=>{
    if(event.target!==stage||event.button!==0||!pet.ready)return;
    const rect=stage.getBoundingClientRect();
    walkTo(event.clientX-rect.left);
    caption.textContent='你点哪里，我就去看看。';
  });

  stage.addEventListener('pointermove',event=>{
    if(pet.drag||!pet.ready||event.pointerType==='touch'||!['idle','look','sleep'].includes(pet.state))return;
    const rect=stage.getBoundingClientRect();
    const x=event.clientX-rect.left,y=event.clientY-rect.top;
    if(Math.hypot(x-pet.x,y-(pet.y-pet.size*.5))>pet.size*1.2)return;
    pet.lastInput=performance.now();
    if(Math.abs(x-pet.x)<25)return;
    const direction=x<pet.x?0:1;
    if(pet.state!=='look'||direction!==pet.look){pet.look=direction;setState('look',900);}
  },{passive:true});

  function goHome() {
    if(!pet.ready)return;
    pet.lastInput=performance.now();
    walkTo(width/2);
    caption.textContent='可以摸摸，也可以拎起来。';
  }

  function openMenu() {
    menu.hidden=false;menuToggle.setAttribute('aria-expanded','true');
    menu.querySelector('button').focus({preventScroll:true});
  }
  function closeMenu(returnFocus=false) {
    menu.hidden=true;menuToggle.setAttribute('aria-expanded','false');
    if(returnFocus)menuToggle.focus({preventScroll:true});
  }
  menuToggle.addEventListener('click',()=>menu.hidden?openMenu():closeMenu(true));
  document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!event.target.closest('.pet-controls'))closeMenu();});
  menu.addEventListener('keydown',event=>{
    const buttons=Array.from(menu.querySelectorAll('button'));
    const current=buttons.indexOf(document.activeElement);
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
      buttons[next].focus();
    }else if(event.key==='Escape'){event.preventDefault();closeMenu(true);}
    else if(event.key==='Tab')closeMenu();
  });
  menu.querySelectorAll('[data-pet-action]').forEach(button=>button.addEventListener('click',()=>{
    pet.lastInput=performance.now();
    const action=button.dataset.petAction;
    if(action==='tidy'){setState('wave',1000);emit('murphy:pet-tidy');}
    if(action==='nap'){setState('sleep');speak('我眯一会儿，随时叫我。');}
    if(action==='home')goHome();
    if(action==='pause'){
      pet.paused=!pet.paused;
      button.setAttribute('aria-checked',String(pet.paused));
      button.textContent=pet.paused?'恢复走动':'暂停走动';
      setState('idle');
      speak(pet.paused?'好，我就在这里陪你。':'好奇心，重新开工。');
    }
    closeMenu(true);
  }));

  document.addEventListener('murphy:pet-home',goHome);
  document.addEventListener('murphy:pet-react',event=>{
    if(!pet.ready||pet.drag)return;
    pet.lastInput=performance.now();
    const kind=event.detail?.kind;
    pet.look=Math.random()<.5?0:1;
    setState(kind==='happy'?'happy':kind==='wave'?'wave':kind==='review'?'review':'look',kind==='review'?2200:1200);
  });
  document.addEventListener('visibilitychange',()=>{
    pet.visible=!document.hidden;
    if(!pet.visible&&raf){cancelAnimationFrame(raf);raf=0;}
    else {previous=0;delayWander();ensureLoop();}
  });
  const observer=new IntersectionObserver(entries=>{
    pet.inView=entries[0].isIntersecting;
    if(pet.inView){previous=0;ensureLoop();}
    else if(raf){cancelAnimationFrame(raf);raf=0;}
  },{threshold:.05});
  observer.observe(stage);
  new ResizeObserver(()=>{if(pet.ready)measure();}).observe(stage);
  motion.addEventListener('change',()=>{
    if(motion.matches){pet.paused=true;pet.y=pet.ground;dragRotation=0;setState('idle');position();}
    const button=menu.querySelector('[data-pet-action="pause"]');
    button.setAttribute('aria-checked',String(pet.paused));button.textContent=pet.paused?'恢复走动':'暂停走动';
  });

  const loadImage=src=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Pet image could not load: '+src));image.src=src;
  });
  loadImage('./pet/heyanju.webp').then(image=>{
    if(image.naturalWidth!==CELL_W*8||image.naturalHeight!==CELL_H*11)throw new Error('Invalid 核验橘 sprite sheet dimensions');
    sheets.pet=image;
    pet.ready=true;
    stage.parentElement.classList.add('pet-active');
    actor.setAttribute('aria-label','核验橘：点击互动，拖动搬家，左右方向键走动，下方向键休息');
    measure(true);setState('idle');
    const button=menu.querySelector('[data-pet-action="pause"]');
    button.setAttribute('aria-checked',String(pet.paused));
    button.textContent=pet.paused?'恢复走动':'暂停走动';
  }).catch(()=>{
    stage.parentElement.classList.add('pet-unavailable');
    caption.textContent='摸摸小猫，把灵感理顺。';
    actor.setAttribute('aria-label','点击小猫，把关键词理顺');
  });
})();
