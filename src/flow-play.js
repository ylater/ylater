(() => {
  'use strict';
  const steps = [
    {
      label: '入院感知',
      hint: '服务从入院开始，先感知入院信息，并核验授权与保障信息。',
      scene: '刚刚入院，理赔服务如何及时接上？',
      prompt: '在获得授权的前提下，让入院信息进入服务流程，核验身份与保障信息。请选择这一阶段。',
      record: '入院信息接入 · 授权与保障核验 · 建立服务记录'
    },
    {
      label: '住院协同',
      hint: '还在住院期间，先让信息、材料与服务进度协同起来。',
      scene: '住院期间，信息和材料正在陆续产生。',
      prompt: '连接用户、医院与服务人员，同步所需信息、材料和待办，减少出院时集中补充。请选择这一阶段。',
      record: '住院信息同步 · 所需材料协同 · 服务进度跟进'
    },
    {
      label: '出院理赔',
      hint: '到了出院节点，把费用、材料、审核与赔付衔接起来。',
      scene: '准备出院，如何让前面的服务接到理赔？',
      prompt: '汇集费用与理赔材料，衔接核对、审核和赔付处理，让用户看懂进度与结果。请选择这一阶段。',
      record: '费用与材料汇集 · 理赔审核衔接 · 赔付结果反馈'
    }
  ];
  const track = document.getElementById('flow-track');
  const choices = document.getElementById('flow-choices');
  const feedback = document.getElementById('flow-feedback');
  const scene = document.getElementById('flow-scene');
  const prompt = document.getElementById('flow-prompt');
  const records = document.getElementById('flow-records');
  const progress = document.getElementById('flow-progress');
  const undo = document.getElementById('flow-undo');
  const panel = document.getElementById('flow-play');
  let connected = 0;
  let order = [];

  function react(kind) {
    document.dispatchEvent(new CustomEvent('murphy:pet-react', { detail: { kind } }));
  }

  function renderTrack() {
    track.replaceChildren();
    steps.forEach((step, index) => {
      const item = document.createElement('li');
      item.className = index < connected ? 'is-connected' : '';
      item.textContent = index < connected ? step.label : `第 ${index + 1} 步`;
      track.append(item);
    });
    scene.textContent = connected < steps.length ? steps[connected].scene : '从入院到出院，服务连成了一条线。';
    prompt.textContent = connected < steps.length ? steps[connected].prompt : '入院有感知，住院有协同，出院接理赔。把分散的环节接起来，让用户少一点重复沟通，多一点过程可见。';
    records.replaceChildren();
    steps.slice(0, connected).forEach(step => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = step.label;
      const description = document.createElement('span');
      description.textContent = step.record;
      item.append(title, description);
      records.append(item);
    });
    records.hidden = connected === 0;
    progress.textContent = `${connected} / ${steps.length}`;
    undo.disabled = connected === 0;
    panel.classList.toggle('is-complete', connected === steps.length);
    choices.querySelectorAll('button').forEach(button => {
      const selected = Number(button.dataset.step) < connected;
      button.disabled = selected;
      button.textContent = steps[Number(button.dataset.step)].label + (selected ? ' ✓' : '');
    });
  }

  function reset() {
    const previous = order.join();
    order = steps.map((_, index) => index);
    const solved = order.join();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Keep the challenge unsolved and make every reset visibly different.
    if (order.join() === solved || order.join() === previous) order.push(order.shift());
    if (order.join() === solved || order.join() === previous) order.push(order.shift());
    connected = 0;
    choices.replaceChildren();
    order.forEach(index => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.step = index;
      button.textContent = steps[index].label;
      button.addEventListener('click', () => {
        if (index !== connected) {
          feedback.textContent = `再看看当前情境。${steps[connected].hint}`;
          react('review');
          return;
        }
        connected++;
        renderTrack();
        if (connected === steps.length) {
          feedback.textContent = '一站式服务线已接通！三个阶段，持续协同，让理赔服务更早介入、连贯跟进。';
          react('happy');
          document.dispatchEvent(new CustomEvent('murphy:pet-say', { detail: { message: '入院到出院，这条服务线接通啦。', duration: 3200 } }));
          document.getElementById('flow-reset').focus({ preventScroll: true });
        } else {
          feedback.textContent = `「${steps[index].label}」接好了。下一步呢？`;
          react('wave');
          choices.querySelector('button:not(:disabled)').focus({ preventScroll: true });
        }
      });
      choices.append(button);
    });
    feedback.textContent = '先从入院这一刻开始，选择对应的服务阶段。';
    renderTrack();
  }
  undo.addEventListener('click', () => {
    if (!connected) return;
    connected--;
    renderTrack();
    feedback.textContent = '退回一步了，换个思路再接。';
    choices.querySelector(`button[data-step="${connected}"]`).focus({ preventScroll: true });
  });
  document.getElementById('flow-reset').addEventListener('click', reset);
  reset();
})();
