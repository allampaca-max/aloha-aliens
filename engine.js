/* A small, dependency-free battle engine, shared by the browser and Node tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AlohaBattle = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CARDS = {
    sunscreen: { name: '선크림 바르기', cost: 1, type: 'skill', label: '스킬', art: 'sunscreen', flavor: 'SPF 50, 생존력 100.', description: '둘 모두 방어도 8 획득.\n카드 1장 뽑기.', target: false },
    spray: { name: '라이드 분사', cost: 1, type: 'attack', label: '공격', art: 'spray', flavor: '집주인의 최후통첩.', description: '적 하나에게 피해 9.\n약화 1턴 부여.', target: true },
    alpaca: { name: '알파카 어택', cost: 1, type: 'attack', label: '공격', art: 'alpaca', flavor: '귀엽다고 방심했지?', description: '적 하나에게 피해 11.\n둘 모두 방어도 5 획득.', target: true },
    tea: { name: '하와이안 허브티', cost: 1, type: 'skill', label: '스킬', art: 'tea', flavor: '일단 한 모금 하고.', description: '둘 모두 체력 7 회복.\n카드 1장 뽑기.', target: false },
    rainbow: { name: '무지개', cost: 2, type: 'power', label: '광역', art: 'rainbow', flavor: '알로하. 그리고 잘 가.', description: '모든 적에게 피해 7.\n모든 적에게 약화 1턴.', target: false }
  };
  const OPENING = ['sunscreen', 'spray', 'alpaca', 'tea', 'rainbow'];
  const DECK = [...OPENING, 'spray', 'alpaca', 'sunscreen', 'spray', 'tea', 'alpaca', 'sunscreen', 'spray', 'tea', 'rainbow'];
  const PATTERNS = {
    centipede: [ { type: 'attack', amount: 6, target: 'girl', name: '발 백 개 돌진' }, { type: 'block', amount: 6, name: '갑각 웅크리기' }, { type: 'attack', amount: 10, target: 'alpaca', name: '백 발 킥' } ],
    roach: [ { type: 'attack', amount: 8, target: 'alpaca', name: '수상한 날갯짓' }, { type: 'attack', amount: 5, target: 'girl', name: '주방 기습' }, { type: 'attack', amount: 10, target: 'girl', name: '저공 비행' } ]
  };
  function shuffle(items, rng) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function log(state, message) { state.logs.unshift(message); state.logs = state.logs.slice(0, 40); }
  function createBattle(rng = Math.random) {
    const cards = DECK.map((key, i) => ({ uid: 'card-' + i, key }));
    return {
      phase: 'player', turn: 1, energy: 3, maxEnergy: 3, rng,
      heroes: [ { id: 'girl', name: '선크림소녀', hp: 72, maxHp: 80, block: 0 }, { id: 'alpaca', name: '알파카', hp: 60, maxHp: 60, block: 0 } ],
      enemies: [ { id: 'centipede', name: '우주 지네', hp: 28, maxHp: 28, block: 0, weak: 0, step: 0 }, { id: 'roach', name: '외계 바퀴', hp: 32, maxHp: 32, block: 0, weak: 0, step: 0 } ],
      hand: cards.slice(0, 5), drawPile: shuffle(cards.slice(5), rng), discardPile: [], played: 0,
      logs: ['마노아의 불청객 등장! 우리 집은 우리가 지킨다.']
    };
  }
  function getIntent(enemy) {
    const intent = { ...PATTERNS[enemy.id][enemy.step % PATTERNS[enemy.id].length] };
    if (intent.type === 'attack' && enemy.weak > 0) intent.amount = Math.floor(intent.amount * .75);
    return intent;
  }
  function draw(state, count, events) {
    for (let i = 0; i < count; i++) {
      if (state.hand.length >= 10) break;
      if (!state.drawPile.length && state.discardPile.length) {
        state.drawPile = shuffle(state.discardPile, state.rng); state.discardPile = [];
        events.push({ type: 'shuffle' });
      }
      if (!state.drawPile.length) break;
      const card = state.drawPile.pop(); state.hand.push(card);
      events.push({ type: 'draw', card: card.uid });
    }
  }
  function hit(unit, amount, events) {
    const absorbed = Math.min(unit.block, amount);
    unit.block -= absorbed;
    const damage = Math.min(unit.hp, amount - absorbed);
    unit.hp -= damage;
    events.push({ type: 'damage', target: unit.id, amount: damage, absorbed });
  }
  function guard(state, amount, events) {
    state.heroes.forEach(hero => { hero.block += amount; events.push({ type: 'block', target: hero.id, amount }); });
  }
  function playCard(state, uid, targetId) {
    if (state.phase !== 'player') return { ok: false, reason: '지금은 카드를 사용할 수 없어요.' };
    const index = state.hand.findIndex(card => card.uid === uid);
    if (index < 0) return { ok: false, reason: '손에 없는 카드예요.' };
    const card = state.hand[index], definition = CARDS[card.key];
    if (state.energy < definition.cost) return { ok: false, reason: '에너지가 부족해요. 턴을 종료하면 3으로 충전돼요.' };
    const target = state.enemies.find(enemy => enemy.id === targetId && enemy.hp > 0);
    if (definition.target && !target) return { ok: false, reason: '공격할 적을 선택해 주세요.' };
    state.energy -= definition.cost;
    state.hand.splice(index, 1);
    state.played++;
    const events = [{ type: 'play', key: card.key }];
    if (card.key === 'sunscreen') { guard(state, 8, events); draw(state, 1, events); }
    if (card.key === 'spray') { hit(target, 9, events); if (target.hp > 0) target.weak += 1; }
    if (card.key === 'alpaca') { hit(target, 11, events); guard(state, 5, events); }
    if (card.key === 'tea') {
      state.heroes.forEach(hero => {
        const healed = Math.min(7, hero.maxHp - hero.hp); hero.hp += healed;
        events.push({ type: 'heal', target: hero.id, amount: healed });
      });
      draw(state, 1, events);
    }
    if (card.key === 'rainbow') state.enemies.filter(enemy => enemy.hp > 0).forEach(enemy => {
      hit(enemy, 7, events); if (enemy.hp > 0) enemy.weak += 1;
    });
    state.discardPile.push(card);
    log(state, definition.name + (target ? ' → ' + target.name : '') + ' 사용.');
    if (state.enemies.every(enemy => enemy.hp === 0)) { state.phase = 'won'; log(state, '퇴치 완료! 오늘도 우리 집은 평화롭다.'); events.push({ type: 'won' }); }
    return { ok: true, events };
  }
  function beginEnemyTurn(state) {
    if (state.phase !== 'player') return false;
    state.phase = 'enemy'; state.discardPile.push(...state.hand); state.hand = [];
    state.enemies.forEach(enemy => { enemy.block = 0; });
    log(state, '불청객들의 차례…');
    return true;
  }
  function resolveEnemy(state, enemyId) {
    const enemy = state.enemies.find(unit => unit.id === enemyId);
    if (state.phase !== 'enemy' || !enemy || enemy.hp <= 0) return [];
    const events = [], intent = getIntent(enemy);
    if (intent.type === 'attack') {
      const hero = state.heroes.find(unit => unit.id === intent.target);
      hit(hero, intent.amount, events);
      const result = events[0];
      log(state, enemy.name + ' → ' + hero.name + ': 피해 ' + result.amount + (result.absorbed ? ' (방어 ' + result.absorbed + ')' : ''));
      if (hero.hp === 0) { state.phase = 'lost'; log(state, '잠깐의 후퇴! 선크림을 챙기고 다시 도전하자.'); events.push({ type: 'lost' }); }
    } else {
      enemy.block += intent.amount; events.push({ type: 'block', target: enemy.id, amount: intent.amount });
      log(state, enemy.name + ': 방어도 ' + intent.amount + ' 획득.');
    }
    enemy.weak = Math.max(0, enemy.weak - 1); enemy.step++;
    return events;
  }
  function beginPlayerTurn(state) {
    if (state.phase !== 'enemy') return [];
    state.phase = 'player'; state.turn++; state.energy = state.maxEnergy;
    state.heroes.forEach(hero => { hero.block = 0; });
    const events = []; draw(state, 5, events);
    log(state, state.turn + '턴: 에너지 충전, 카드 ' + state.hand.length + '장 뽑기.');
    return events;
  }
  return { CARDS, DECK, createBattle, getIntent, playCard, beginEnemyTurn, resolveEnemy, beginPlayerTurn };
});
