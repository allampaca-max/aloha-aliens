(function () {
  'use strict';
  const B = window.AlohaBattle, A = window.AlohaArt;
  const $ = id => document.getElementById(id);
  let battle = B.createBattle(), selected = null, generation = 0, toastTimer;
  let soundEnabled = false, audioContext;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = ms => new Promise(resolve => setTimeout(resolve, reducedMotion ? Math.min(ms, 80) : ms));
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  $('landscape').innerHTML = A.landscape;
  function heroName(id) { return battle.heroes.find(hero => hero.id === id)?.name || ''; }
  function unitMarkup(unit, enemy) {
    const intent = enemy && B.getIntent(unit);
    const intentText = enemy && unit.hp > 0 ? (intent.type === 'attack' ? `피해 ${intent.amount}, ${heroName(intent.target)} 공격` : `방어도 ${intent.amount} 획득`) : '';
    return `${enemy && unit.hp > 0 ? `<div class="intent"><span class="intent-action ${intent.type === 'block' ? 'defend' : ''}">${A.icon(intent.type === 'attack' ? 'attack' : 'shield')}${intent.type === 'block' ? '+' : ''}${intent.amount}</span><span class="intent-target">${intent.type === 'attack' ? heroName(intent.target) + ' 공격' : '방어도 획득'}</span></div>` : ''}
      <div class="unit-art">${A.character(unit.id)}</div>
      <div class="unit-name">${enemy ? '<span class="alien-mark">✧</span>' : ''}${unit.name}</div>
      <div class="hp-bar" role="meter" aria-label="${unit.name} 체력" aria-valuemin="0" aria-valuemax="${unit.maxHp}" aria-valuenow="${unit.hp}"><div class="hp-fill" style="width:${unit.hp / unit.maxHp * 100}%"></div></div>
      <div class="hp-caption">${A.icon('heart')}<span>${unit.hp} / ${unit.maxHp}</span>${unit.hp === 0 ? '<span>· 퇴치</span>' : ''}</div>
      <div class="unit-buffs">${unit.block ? `<span class="buff" title="방어도: 받는 피해를 먼저 흡수합니다">${A.icon('shield')}${unit.block}</span>` : ''}${unit.weak ? `<span class="buff weak" title="약화: 공격 피해 25% 감소. 남은 ${unit.weak}턴">${A.icon('leaf')}약화 ${unit.weak}</span>` : ''}</div>
      ${enemy ? `<span class="sr-only">다음 행동: ${intentText || '퇴치 완료'}</span>` : ''}`;
  }
  function renderUnits() {
    $('party').innerHTML = battle.heroes.map(unit => `<div class="unit hero" id="unit-${unit.id}">${unitMarkup(unit, false)}</div>`).join('');
    $('enemy-party').innerHTML = battle.enemies.map(unit => `<button class="unit enemy ${unit.hp === 0 ? 'defeated' : ''}" id="unit-${unit.id}" data-enemy="${unit.id}" ${unit.hp === 0 || battle.phase !== 'player' ? 'disabled' : ''} aria-label="${unit.name}, 체력 ${unit.hp}/${unit.maxHp}. ${unit.hp > 0 ? (B.getIntent(unit).type === 'attack' ? '다음 공격 ' + B.getIntent(unit).amount + ', 대상 ' + heroName(B.getIntent(unit).target) : '다음 방어 ' + B.getIntent(unit).amount) : '퇴치 완료'}">${unitMarkup(unit, true)}</button>`).join('');
    renderTargets();
  }
  function renderHand() {
    const scroll = $('hand').scrollLeft;
    $('hand').innerHTML = battle.hand.map((card, i) => {
      const d = B.CARDS[card.key], affordable = battle.energy >= d.cost;
      return `<button class="card ${d.type} ${selected === card.uid ? 'selected' : ''} ${affordable ? '' : 'unaffordable'}" data-card="${card.uid}" ${battle.phase !== 'player' ? 'disabled' : ''} aria-pressed="${selected === card.uid}" aria-disabled="${!affordable}" aria-label="${i + 1}. ${d.name}, 에너지 ${d.cost}, ${d.description.replace(/\n/g, ' ')}${affordable ? '' : ' 에너지 부족'}"><span class="card-cost">${d.cost}</span><span class="card-title">${d.name}</span><span class="card-art">${A.card(d.art)}</span><span class="card-type ${d.type}">${d.label}</span><span class="card-description">${d.description}</span><span class="card-flavor">${d.flavor}</span></button>`;
    }).join('');
    if (!battle.hand.length && battle.phase === 'player') $('hand').innerHTML = '<div class="empty-hand">손이 비었어요. 턴을 종료해 카드를 뽑으세요.</div>';
    $('hand').scrollLeft = scroll;
  }
  function renderTargets() {
    battle.enemies.forEach(enemy => {
      const el = $('unit-' + enemy.id);
      if (el) el.classList.toggle('selectable', !!selected && enemy.hp > 0 && battle.phase === 'player');
    });
  }
  function renderControls() {
    const playing = battle.phase === 'player';
    $('energy-count').textContent = battle.energy;
    $('energy-orb').classList.toggle('empty', battle.energy === 0);
    $('energy-pips').innerHTML = [0,1,2].map(i => `<i class="${i < battle.energy ? '' : 'spent'}"></i>`).join('');
    $('draw-count').textContent = battle.drawPile.length;
    $('discard-count').textContent = battle.discardPile.length;
    $('turn-label').textContent = `${battle.turn}턴 · ${playing ? '내 차례' : battle.phase === 'enemy' ? '적의 차례' : battle.phase === 'won' ? '퇴치 완료' : '전투 종료'}`;
    document.querySelector('.turn-badge').classList.toggle('enemy-turn', battle.phase === 'enemy');
    $('phase-title').textContent = playing ? '우리의 차례' : battle.phase === 'enemy' ? '불청객의 차례' : battle.phase === 'won' ? '임무 완료!' : '다시 도전해요';
    const card = battle.hand.find(c => c.uid === selected);
    $('instruction').textContent = card ? `${B.CARDS[card.key].name} → 공격할 적을 선택하세요.` : playing ? battle.energy ? '카드를 골라 불청객을 쫓아내세요.' : '에너지를 모두 썼어요. 턴을 종료하세요.' : battle.phase === 'enemy' ? '적이 행동하고 있어요…' : battle.phase === 'won' ? '불청객 퇴치 완료. 우리 집은 안전해요.' : '선크림을 챙기고 다시 도전해 봐요.';
    $('end-turn').disabled = !playing;
    $('end-turn').innerHTML = battle.phase === 'enemy' ? '적 행동 중…' : '턴 종료 <span aria-hidden="true">→</span>';
    $('end-note').textContent = playing ? '남은 카드는 버려집니다' : battle.phase === 'enemy' ? '잠깐만 기다려 주세요' : '한 판 더 도전해 볼까요?';
    $('cancel-card').hidden = !selected;
  }
  function render() { renderUnits(); renderHand(); renderControls(); }
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show');
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
  }
  function sound(kind) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.connect(gain); gain.connect(audioContext.destination);
      const frequency = kind === 'damage' ? 150 : kind === 'won' ? 660 : kind === 'heal' ? 520 : 350;
      oscillator.type = kind === 'damage' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (kind === 'damage' ? .5 : 1.5), audioContext.currentTime + .16);
      gain.gain.setValueAtTime(.06, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .2);
      oscillator.start(); oscillator.stop(audioContext.currentTime + .22);
    } catch (_) { soundEnabled = false; updateSoundButton(); toast('이 브라우저에서는 효과음을 사용할 수 없어요.'); }
  }
  function animate(events) {
    events.forEach(event => {
      if (event.type === 'play') sound(event.key === 'tea' ? 'heal' : 'play');
      if (event.type === 'play' && event.key === 'rainbow') {
        $('fx-layer').classList.remove('rainbow-flash'); void $('fx-layer').offsetWidth; $('fx-layer').classList.add('rainbow-flash');
      }
      if (!['damage', 'block', 'heal'].includes(event.type)) return;
      const el = $('unit-' + event.target); if (!el) return;
      el.classList.add(event.type === 'damage' ? 'hit-flash' : 'guard-flash');
      setTimeout(() => el.classList.remove('hit-flash', 'guard-flash'), 450);
      if (event.type === 'damage') sound('damage');
      const bounds = el.getBoundingClientRect(), scene = $('battlefield')?.getBoundingClientRect() || document.querySelector('.battlefield').getBoundingClientRect();
      const label = document.createElement('span'); label.className = 'floating-number ' + event.type;
      label.textContent = event.type === 'damage' ? event.amount === 0 ? '방어!' : '−' + event.amount : event.type === 'block' ? '◇ +' + event.amount : event.amount ? '+' + event.amount : '';
      if (!label.textContent) return;
      label.style.left = bounds.left - scene.left + bounds.width / 2 + 'px';
      label.style.top = bounds.top - scene.top + bounds.height * .35 + 'px';
      $('fx-layer').appendChild(label); setTimeout(() => label.remove(), 900);
    });
  }
  function selectCard(uid) {
    if (battle.phase !== 'player') return;
    const card = battle.hand.find(c => c.uid === uid); if (!card) return;
    const d = B.CARDS[card.key];
    if (battle.energy < d.cost) { toast('에너지가 부족해요. 턴을 종료하면 3으로 충전돼요.'); return; }
    if (!d.target) { selected = null; useCard(uid); return; }
    selected = selected === uid ? null : uid;
    renderHand(); renderTargets(); renderControls();
    if (selected) { sound('select'); $('unit-' + battle.enemies.find(e => e.hp > 0).id).focus({ preventScroll: true }); }
  }
  function useCard(uid, targetId) {
    const result = B.playCard(battle, uid, targetId);
    if (!result.ok) { toast(result.reason); return; }
    selected = null; render(); animate(result.events);
    if (result.events.some(event => event.type === 'shuffle')) toast('버린 카드를 섞어 새 뽑기 더미를 만들었어요.');
    if (battle.phase === 'won') showResultSoon();
  }
  function cancelSelection() { if (!selected) return; selected = null; renderHand(); renderTargets(); renderControls(); }
  async function endTurn() {
    if (!B.beginEnemyTurn(battle)) return;
    const token = generation; selected = null; render();
    await delay(400); if (token !== generation) return;
    for (const enemy of battle.enemies) {
      if (enemy.hp === 0) continue;
      const events = B.resolveEnemy(battle, enemy.id); renderUnits(); renderControls(); animate(events);
      await delay(650); if (token !== generation) return;
      if (battle.phase === 'lost') { showResultSoon(); return; }
    }
    B.beginPlayerTurn(battle); render();
    $('hand').scrollLeft = 0; $('hand').classList.remove('phase-transition'); void $('hand').offsetWidth; $('hand').classList.add('phase-transition');
    sound('turn');
  }
  function showResultSoon() {
    const token = generation;
    setTimeout(() => {
      if (token !== generation) return;
      if ($('info-dialog').open) $('info-dialog').close();
      const won = battle.phase === 'won';
      $('result-icon').textContent = won ? '✳' : '☂';
      $('result-eyebrow').textContent = won ? 'MISSION COMPLETE' : 'A LITTLE SETBACK';
      $('result-title').textContent = won ? '오늘도 우리 집은 평화롭다!' : '오늘은 불청객이 좀 셌다…';
      $('result-copy').innerHTML = won ? '선크림소녀와 알파카의 완벽한 팀워크.<br>이제 안심하고 라나이에서 허브티 한 잔.' : '괜찮아요. 선크림 한 번 더 바르고 다시 가요.<br>방어도와 약화를 활용하면 훨씬 든든해요.';
      $('result-stats').innerHTML = `<div><strong>${battle.turn}</strong><small>전투 턴</small></div><div><strong>${battle.played}</strong><small>사용한 카드</small></div><div><strong>${battle.heroes.reduce((n, hero) => n + hero.hp, 0)}</strong><small>남은 체력</small></div>`;
      if (!$('result-dialog').open) $('result-dialog').showModal(); sound(won ? 'won' : 'damage');
    }, reducedMotion ? 120 : 700);
  }
  function restart() {
    generation++; selected = null; battle = B.createBattle();
    if ($('info-dialog').open) $('info-dialog').close();
    if ($('result-dialog').open) $('result-dialog').close();
    clearTimeout(toastTimer); $('toast').classList.remove('show'); $('fx-layer').innerHTML = ''; render(); $('hand').scrollLeft = 0;
  }
  function openInfo(content) { $('dialog-content').innerHTML = content; if (!$('info-dialog').open) $('info-dialog').showModal(); }
  function showHelp() {
    openInfo(`<div class="eyebrow">A LITTLE FIELD GUIDE</div><h2 style="margin-top:12px">우리 집을 지키는 법</h2><p class="dialog-subtitle">선크림소녀와 알파카의 하와이 생존기.<br>지네와 바퀴? 일단 외계인이라고 해 두자.</p><ol class="help-steps"><li><span class="help-number">1</span><span>매 턴 <b>에너지 3</b>으로 시작하고 <b>카드 5장</b>을 뽑아요. 왼쪽 위 숫자가 카드의 에너지 비용이에요.</span></li><li><span class="help-number">2</span><span><b>공격 카드 → 적 선택</b> 순서로 터치해요. 선크림·허브티·무지개는 터치하면 바로 사용해요. 폰에서는 카드 줄을 좌우로 넘겨 보세요.</span></li><li><span class="help-number">3</span><span>적 위의 아이콘은 <b>다음 행동</b>이에요. 공격 피해량과 대상을 보고 방어해요. 방패 아이콘은 적이 방어도를 얻는다는 뜻이에요.</span></li><li><span class="help-number">4</span><span><b>턴 종료</b>를 누르면 남은 패를 버리고 적이 행동해요. 그다음 에너지와 새 패를 받아요. 적 둘을 모두 퇴치하면 승리!</span></li></ol><p class="rules-note">방어도는 체력 대신 피해를 흡수하고, 자신의 다음 턴 시작에 사라져요. 약화는 적의 공격 피해를 25% 줄이며 적이 한 번 행동하면 1턴 감소해요. 둘 중 한 명의 체력이 0이 되면 패배해요. 뽑을 카드가 없으면 버린 카드를 섞어요. 손패는 최대 10장이에요.</p><p class="key-hints">키보드: <kbd>1</kbd>–<kbd>9</kbd> 카드 선택 · <kbd>←</kbd><kbd>→</kbd> 적 선택 · <kbd>Enter</kbd> 공격 · <kbd>Esc</kbd> 선택 취소 · <kbd>E</kbd> 턴 종료</p>`);
  }
  function showPile(kind) {
    const cards = kind === 'draw' ? battle.drawPile : battle.discardPile;
    const title = kind === 'draw' ? '뽑을 카드' : '버린 카드';
    // Sort the draw pile for display so viewing it never reveals draw order.
    const display = cards.slice().sort((a,b) => a.key.localeCompare(b.key));
    openInfo(`<div class="eyebrow">${kind === 'draw' ? 'DRAW PILE' : 'DISCARD PILE'}</div><h2 style="margin-top:12px">${title} <span style="color:var(--gold)">${cards.length}</span></h2><p class="dialog-subtitle">${kind === 'draw' ? '섞여 있는 카드 목록이에요. 실제 뽑는 순서는 달라요.' : '다 쓴 카드와 턴 종료 때 남은 카드예요.'}</p>${cards.length ? `<div class="pile-list">${display.map(card => `<div class="pile-item"><span class="cost-mini">${B.CARDS[card.key].cost}</span>${B.CARDS[card.key].name}</div>`).join('')}</div>` : '<p class="empty-pile">아직 카드가 없어요.</p>'}`);
  }
  function updateSoundButton() {
    $('sound-button').innerHTML = A.icon(soundEnabled ? 'sound' : 'mute');
    $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
    $('sound-button').setAttribute('aria-label', soundEnabled ? '효과음 끄기' : '효과음 켜기');
    $('sound-button').title = soundEnabled ? '효과음 끄기' : '효과음 켜기';
  }
  $('hand').addEventListener('click', event => { const card = event.target.closest('[data-card]'); if (card) selectCard(card.dataset.card); });
  $('enemy-party').addEventListener('click', event => {
    const enemy = event.target.closest('[data-enemy]'); if (!enemy || enemy.disabled) return;
    if (selected) useCard(selected, enemy.dataset.enemy);
    else toast('공격 카드를 먼저 고른 뒤 적을 터치해 주세요.');
  });
  $('end-turn').addEventListener('click', endTurn);
  $('cancel-card').addEventListener('click', cancelSelection);
  $('restart-button').addEventListener('click', () => {
    if (battle.played === 0 && battle.turn === 1 && battle.phase === 'player') { restart(); toast('새 전투를 준비했어요!'); return; }
    openInfo('<div class="eyebrow">FRESH START</div><h2 style="margin-top:12px">다시 출발할까요?</h2><p class="dialog-subtitle">현재 전투가 초기화되고 1턴부터 다시 시작해요.</p><button class="end-turn" id="confirm-restart" style="margin-top:22px">처음부터 다시 <span aria-hidden="true">↻</span></button>');
    $('confirm-restart').addEventListener('click', restart);
  });
  $('play-again').addEventListener('click', restart);
  $('close-result').addEventListener('click', () => $('result-dialog').close());
  $('help-button').addEventListener('click', showHelp);
  $('close-info').addEventListener('click', () => $('info-dialog').close());
  $('log-button').addEventListener('click', () => openInfo(`<div class="eyebrow">BATTLE NOTES</div><h2 style="margin-top:12px">전투 기록</h2><p class="dialog-subtitle">가장 최근 행동부터 표시해요.</p><ul class="log-list">${battle.logs.map(message => `<li>${escape(message)}</li>`).join('')}</ul>`));
  $('draw-button').addEventListener('click', () => showPile('draw'));
  $('discard-button').addEventListener('click', () => showPile('discard'));
  $('sound-button').addEventListener('click', () => { soundEnabled = !soundEnabled; updateSoundButton(); sound('select'); });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  }));
  document.addEventListener('keydown', event => {
    if ($('info-dialog').open || $('result-dialog').open || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.key === 'Escape') { cancelSelection(); return; }
    if (battle.phase !== 'player') return;
    if (/^[1-9]$/.test(event.key)) { const card = battle.hand[Number(event.key)-1]; if (card) selectCard(card.uid); }
    if (event.key.toLowerCase() === 'e') { event.preventDefault(); endTurn(); }
    if (selected && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault(); const alive = battle.enemies.filter(enemy => enemy.hp > 0);
      const index = alive.findIndex(enemy => $('unit-' + enemy.id) === document.activeElement);
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + alive.length) % alive.length;
      $('unit-' + alive[next].id).focus({ preventScroll: true });
    }
  });
  updateSoundButton(); render();
})();
