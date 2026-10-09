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
      {x:20,y:20,r:-12},
      {x:81,y:59,r:10},
      {x:17,y:66,r:-8},
      {x:81,y:18,r:12}
    ];
    const thoughts = {
      '界面':'看着舒服，用着顺手。',
      '流程':'先理顺，再写代码。',
      '规则':'该确定的，交给规则。',
      'AI':'用新工具，解真问题。'
    };
    let tidy = false;
    let whisperTimer;
    let lastTrigger = null;

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
      // Reading order: interface, flow, rules, AI.
      return widths.map(w=>{const center=(left+w/2)/rect.width*100;left+=w+gap;return center;});
    }

    function tidyWords() {
      tidy = !tidy;
      if(tidy) {
        const positions=rowPositions();
        words.forEach((el,i)=>place(el,positions[i],81,0));
        caption.textContent='收拾好了。也可以拖着玩。';
        say('好了，又简单了一点。');
      } else {
        words.forEach((el,i)=>place(el,initial[i].x,initial[i].y,initial[i].r));
        caption.textContent='偶尔散开，也会有新想法。';
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
        if(drag.moved)caption.textContent='想法有点乱？小猫随时帮忙。';
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
      if(tidy){const p=rowPositions();words.forEach((el,i)=>place(el,p[i],81,0));}
      else{
        const rect=stage.getBoundingClientRect();
        words.forEach(el=>{
          const pad=(el.offsetWidth/2+5)/rect.width*100;
          const x=parseFloat(el.style.getPropertyValue('--x'));
          if(x<pad||x>100-pad)place(el,Math.max(pad,Math.min(100-pad,x)),parseFloat(el.style.getPropertyValue('--y')),0);
        });
      }
    });

    const adjective=$('word-button');
    const variations=[['简单','把复杂留给系统，把简单留给人。'],['好用','能用，还要用着顺手。'],['好玩','认真之外，也留一点有趣。'],['清楚','说清楚，想明白，再动手。']];
    let adjectiveIndex=0;
    adjective.addEventListener('click',()=>{
      adjectiveIndex=(adjectiveIndex+1)%variations.length;
      const [text,note]=variations[adjectiveIndex];
      adjective.textContent=text;
      adjective.setAttribute('aria-label',text+'，点击换个角度');
      adjective.classList.remove('changed');
      void adjective.offsetWidth;
      adjective.classList.add('changed');
      $('announcement').textContent=note;
      say(note,2800);
      document.dispatchEvent(new CustomEvent('murphy:pet-react',{detail:{kind:'happy'}}));
    });

    const entries={
      about:{kicker:'A SHORT USER MANUAL',title:'你好，我是 Murphy。',lede:'理解问题，把想法做成产品。',paragraphs:['我长期参与商业保险理赔相关的技术与服务应用建设。从业务规则、理赔流程到服务协同，把复杂需求落到具体的产品与交互中；也探索 AI 如何融入实际工作，成为可用、可维护的能力。','喜欢直接的表达、准确的细节，也喜欢能让人多玩两下的网页。'],rows:[['工作重心','商业保险理赔、技术与服务应用、AI 实践。'],['做事习惯','先理清业务，再把流程和交互做顺。'],['审美偏好','信息少一点，细节准一点，有趣一点。'],['持续探索','知识库 · 规则引擎 · 智能体 · 交互体验'] ],footer:'这份说明书，持续更新中。'},
      rmc:{kicker:'01 / INSURANCE CLAIMS & SERVICES',title:'数智赔',lede:'让复杂的理赔流程，变得清楚、连贯。',paragraphs:['围绕商业保险理赔，参与传统理赔、直赔与一站式结算等产品建设，将业务规则、信息流转、审核与支付等环节，落实为可操作的系统与服务。','关注用户端、业务工作台与服务环节的衔接，让信息流转更清楚、处理流程更连贯，让每个参与者知道当前进度与下一步操作。'],rows:[['参与方向','传统理赔、直赔、一站式结算及相关用户端。'],['关注重点','业务流程、信息呈现、状态衔接与操作体验。']],tags:['商业保险理赔','业务协同','技术与服务'],footer:'企业内部项目 · 理赔技术与服务应用'},
      emed:{kicker:'02 / A MORE HELPFUL INTERFACE',title:'医问百通',lede:'让专业信息更好懂，让相关服务更好用。',paragraphs:['围绕药品、医院、医保与保险保障等信息，参与查询工具、知识问答与用户端服务建设，让专业内容更容易查找、理解和使用。','继续探索「小问」的交互式对话：把答案里的药品、医院与保障信息，变成可以继续查看和操作的内容。'],rows:[['产品场景','药品查询、医院查询、保障问答与服务权益。'],['探索方向','AI 对话、结构化结果、Web 与小程序体验。']],tags:['医问百通 · 小问','交互式对话'],footer:'团队项目 · 产品建设与交互探索'},
      ai:{kicker:'03 / TOOLS THAT DO REAL WORK',title:'AI 工具',lede:'新能力，接上真实的工作。',paragraphs:['探索知识库、规则校验、工作流与统一模型接入，关心 AI 如何嵌入现有系统，也关心它的边界在哪里。','需要确定性的地方，用明确规则；需要理解与检索的地方，让模型参与。让结果能解释，工具能维护。'],rows:[['持续探索','行业知识库、智能体编排与企业 AI 工具。'],['关心的问题','能否接入业务、复用能力、追踪过程并持续维护。']],tags:['知识库','规则与工作流','AI Gateway'],footer:'探索方向 · 持续实践'},
      play:{kicker:'04 / SERIOUS ABOUT PLAY',title:'交互实验',lede:'认真造东西，顺手玩一下。',paragraphs:['从可复用的交互组件，到一间宋式街角店铺、一只可以互动的毛绒小动物，给好奇心留一个具体的出口。','喜欢简洁的画面，也愿意为了一个动作、一处排版和一点材质，再调整一次。'],rows:[['实验题目','三维小场景、可互动角色、生成式界面。'],['偏爱细节','宋式美学、微缩景观、细腻材质与轻巧动效。']],tags:['Three.js','生成式 UI','视觉与交互'],footer:'个人探索 · 好奇心在场'}
    };

    const dialog=$('detail-dialog');
    function addText(tag,className,text,parent) {
      const el=document.createElement(tag);
      if(className)el.className=className;
      el.textContent=text;
      parent.appendChild(el);
      return el;
    }
    function openDetail(key,trigger) {
      const entry=entries[key];
      if(!entry)return;
      lastTrigger=trigger;
      $('dialog-kicker').textContent=entry.kicker;
      $('dialog-footer-label').textContent=entry.footer;
      const content=$('dialog-content');
      content.replaceChildren();
      const title=addText('h2','dialog-title',entry.title,content);
      title.id='dialog-title';
      addText('p','dialog-lede',entry.lede,content);
      entry.paragraphs.forEach(p=>addText('p','dialog-copy',p,content));
      if(entry.rows){
        const list=document.createElement('ul');
        list.className='detail-list';
        entry.rows.forEach(([name,description])=>{
          const item=document.createElement('li');
          addText('strong','',name,item);
          addText('span','',description,item);
          list.appendChild(item);
        });
        content.appendChild(list);
      }
      if(entry.tags){
        const tags=document.createElement('div');
        tags.className='tags';
        entry.tags.forEach(t=>addText('span','tag',t,tags));
        content.appendChild(tags);
      }
      document.body.style.overflow='hidden';
      dialog.showModal();
      dialog.scrollTop=0;
      document.dispatchEvent(new CustomEvent('murphy:pet-react',{detail:{kind:'review'}}));
    }
    document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openDetail(button.dataset.open,button)));
    $('dialog-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',(event)=>{
      if(event.target!==dialog)return;
      const r=dialog.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
    });
    dialog.addEventListener('close',()=>{
      document.body.style.overflow='';
      if(lastTrigger)lastTrigger.focus({preventScroll:true});
      document.dispatchEvent(new CustomEvent('murphy:pet-react',{detail:{kind:'wave'}}));
    });
    document.querySelector('.wordmark').addEventListener('click',(event)=>{
      event.preventDefault();
      adjectiveIndex=0;
      adjective.textContent='简单';
      adjective.setAttribute('aria-label','简单，点击换个角度');
      tidy=false;
      words.forEach((el,i)=>place(el,initial[i].x,initial[i].y,initial[i].r));
      caption.textContent='可以摸摸，也可以拎起来。';
      whisper.classList.remove('visible');
      window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
      document.dispatchEvent(new CustomEvent('murphy:pet-home'));
    });
    $('year').textContent=new Date().getFullYear();
  })();
