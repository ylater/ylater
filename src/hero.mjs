import { createHeadlineCycle } from './headline-cycle.mjs';
(() => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const stage = $('stage');
    const cat = $('cat-button');
    const caption = $('stage-caption');
    const whisper = $('whisper');
    const words = Array.from(document.querySelectorAll('.orbit-word'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const initial = [
      {x:22,y:23,r:-8},
      {x:80,y:63,r:6},
      {x:80,y:23,r:8},
      {x:20,y:65,r:-5}
    ];
    const thoughts = {
      '产品':'先想清楚，再做顺手。',
      '理赔':'从入院到出院，把服务接起来。',
      'AI':'用新工具，解真问题。',
      '好奇':'认真做事，也认真玩一下。'
    };
    let tidy = false;
    let whisperTimer;


    function say(message, duration=2600) {
      clearTimeout(whisperTimer);
      whisper.textContent = message;
      whisper.classList.add('visible');
      whisperTimer = setTimeout(() => whisper.classList.remove('visible'), duration);
    }

    function place(el, x, y, r=0) {
      el.style.setProperty('--x', x.toFixed(2));
      el.style.setProperty('--y', y.toFixed(2));
      el.style.setProperty('--r', r.toFixed(2) + 'deg');
    }

    function rowPositions() {
      const rect=stage.getBoundingClientRect();
      const gap=Math.min(9,rect.width*.018);
      const widths=words.map(el=>el.offsetWidth);
      const total=widths.reduce((a,b)=>a+b,0)+gap*3;
      let left=(rect.width-total)/2;
      // Reading order: product, claims, AI, curiosity.
      return widths.map(w=>{const center=(left+w/2)/rect.width*100;left+=w+gap;return center;});
    }

    function tidyWords() {
      tidy = !tidy;
      if(tidy) {
        const positions=rowPositions();
        words.forEach((el,i)=>place(el,positions[i],92,0));
        caption.textContent='收拾好了，想法也顺了。';
        say('好了，又简单了一点。');
      } else {
        words.forEach((el,i)=>place(el,initial[i].x,initial[i].y,initial[i].r));
        caption.textContent='散开一点，也能冒出新想法。';
        say('整齐很好。好奇也很好。');
      }
    }
    document.addEventListener('murphy:pet-tidy',tidyWords);
    document.addEventListener('murphy:pet-say',event=>say(event.detail.message,event.detail.duration||2600));

    for (const word of words) {
      let drag = null;
      let suppressClick=false;
      word.addEventListener('pointerdown',(event)=>{
        if(event.button!==0)return;
        const rect=stage.getBoundingClientRect();
        drag={pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:parseFloat(word.style.getPropertyValue('--x')),y:parseFloat(word.style.getPropertyValue('--y')),moved:false,rect};
        word.setPointerCapture(event.pointerId);
      });
      word.addEventListener('pointermove',(event)=>{
        if(!drag||drag.pointer!==event.pointerId)return;
        const dx=event.clientX-drag.startX;
        const dy=event.clientY-drag.startY;
        if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
        if(!drag.moved)return;
        word.classList.add('dragging');
        tidy=false;
        const padX=(word.offsetWidth/2+5)/drag.rect.width*100;
        const padY=(word.offsetHeight/2+5)/drag.rect.height*100;
        const x=Math.min(100-padX,Math.max(padX,drag.x+dx/drag.rect.width*100));
        const y=Math.min(86,Math.max(padY,drag.y+dy/drag.rect.height*100));
        place(word,x,y,Math.max(-15,Math.min(15,dx*.06)));
      });
      function endDrag(event) {
        if(!drag||event.pointerId!==drag.pointer)return;
        suppressClick=drag.moved;
        if(drag.moved)caption.textContent='想法换个位置，也许就通了。';
        word.classList.remove('dragging');
        if(word.hasPointerCapture(event.pointerId))word.releasePointerCapture(event.pointerId);
        drag=null;
        if(event.type==='pointercancel')suppressClick=false;
      }
      word.addEventListener('pointerup',endDrag);
      word.addEventListener('pointercancel',endDrag);
      word.addEventListener('lostpointercapture',()=>{word.classList.remove('dragging');drag=null;});
      word.addEventListener('click',(event)=>{
        if(suppressClick&&event.detail!==0){suppressClick=false;return;}
        say(thoughts[word.dataset.word]);
        document.dispatchEvent(new CustomEvent('murphy:pet-react',{detail:{kind:'curious'}}));
      });
      word.addEventListener('keydown',(event)=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
        event.preventDefault();
        const rect=stage.getBoundingClientRect();
        let x=parseFloat(word.style.getPropertyValue('--x'));
        let y=parseFloat(word.style.getPropertyValue('--y'));
        if(event.key==='Home'){
          const state=initial[words.indexOf(word)];
          place(word,state.x,state.y,state.r);
        }else{
          const step=event.shiftKey?8:3;
          if(event.key==='ArrowLeft')x-=step;
          if(event.key==='ArrowRight')x+=step;
          if(event.key==='ArrowUp')y-=step;
          if(event.key==='ArrowDown')y+=step;
          const pad=(word.offsetWidth/2+5)/rect.width*100;
          place(word,Math.max(pad,Math.min(100-pad,x)),Math.max(9,Math.min(86,y)),0);
        }
        tidy=false;
      });
    }

    window.addEventListener('resize',()=>{
      if(tidy){const p=rowPositions();words.forEach((el,i)=>place(el,p[i],92,0));}
      else{
        const rect=stage.getBoundingClientRect();
        words.forEach(el=>{
          const pad=(el.offsetWidth/2+5)/rect.width*100;
          const x=parseFloat(el.style.getPropertyValue('--x'));
          if(x<pad||x>100-pad)place(el,Math.max(pad,Math.min(100-pad,x)),parseFloat(el.style.getPropertyValue('--y')),0);
        });
      }
    });


    const adjective = $('word-button');
    const automatic = $('headline-auto');
    let autoEnabled = !reducedMotion.matches;
    const cycle = createHeadlineCycle((text, note, manual) => {
      const changed = adjective.textContent !== text;
      adjective.textContent = text;
      adjective.setAttribute('aria-label', text + '，点击换个角度');
      adjective.classList.remove('changed');
      if (changed && !reducedMotion.matches) {
        void adjective.offsetWidth;
        adjective.classList.add('changed');
      }
      if (manual) {
        say(note, 2800);
        $('headline-announcement').textContent = note;
        document.dispatchEvent(new CustomEvent('murphy:pet-react', { detail: { kind: 'happy' } }));
      }
    });
    function updateAutomatic() {
      automatic.setAttribute('aria-pressed', String(autoEnabled));
      automatic.textContent = autoEnabled ? '暂停自动换词' : '开启自动换词';
      cycle.pause('user', !autoEnabled);
    }
    adjective.addEventListener('click', () => cycle.next());
    adjective.addEventListener('focus', () => cycle.pause('focus', true));
    adjective.addEventListener('blur', () => cycle.pause('focus', false));
    automatic.addEventListener('click', () => { autoEnabled = !autoEnabled;updateAutomatic(); });
    document.addEventListener('visibilitychange', () => cycle.pause('hidden', document.hidden));
    document.addEventListener('murphy:dialog', event => cycle.pause('dialog', event.detail.open));
    new IntersectionObserver(entries => cycle.pause('offscreen', !entries[0].isIntersecting), { threshold: .05 }).observe($('headline'));
    reducedMotion.addEventListener('change', () => { autoEnabled = !reducedMotion.matches;updateAutomatic(); });
    document.querySelectorAll('.wordmark').forEach(link => link.addEventListener('click', () => {
      tidy = false;words.forEach((el, i) => place(el, initial[i].x, initial[i].y, initial[i].r));
      cycle.reset();caption.textContent = '摸摸核验橘，也可以拎起来。';
      whisper.classList.remove('visible');
      document.dispatchEvent(new CustomEvent('murphy:pet-home'));
    }));
    updateAutomatic();
})();
