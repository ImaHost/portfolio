/*
 * 화면 유형 'rag-chat' — 근거 기반 AI 질의응답 (설계 0001 §3-2 · §4-2)
 * 원본 규정질의응답 화면의 구조 · 문구를 재구성했다(출처는 설계 문서 §3-2).
 *   왼쪽 대화: 시작 화면(예시 질문) · 질문 말풍선 · 답 카드(처리 과정 → 답 → 답에 인용한 근거 칩) · 입력 상자
 *   오른쪽 근거 패널: 근거 카드(번호 · 출처 구분 · 규정명 · 위치 · 본문 세 줄)
 *
 * 각본 동작(actions): pick · type · send · step · evidence · stream · finish · cite
 * 커서 목표(target): 'example:<i>' · 'input' · 'send' · 'cite:<n>'
 * 텍스트는 모두 textContent로 넣는다(HTML 해석 없음). 내부 스크롤만 움직이고 페이지 스크롤은 건드리지 않는다.
 */
(function (window, document) {
  'use strict';
  if (!window.AgentDemo) return;

  var LABEL = {
    newChat: '새 대화',
    you: '나',
    ai: 'AI 추천 답변',
    writing: '답변 작성 중',
    evidence: '근거',
    evidenceEmpty: '답변의 근거 원문이 여기에 보입니다.',
    expand: '펼치기',
    openOriginal: '원문 보기',
    source: { TOOL: '계산 결과' },
    running: function (label) { return label + ' 중'; },
    done: function (n, ms) { return '처리 과정 · ' + n + '단계 · ' + (ms / 1000).toFixed(1) + '초'; },
    refsCited: function (n) { return '답에 인용한 근거 ' + n + '건'; },
    page: function (p) { return p ? 'p.' + p : ''; }
  };

  var STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.8 5.3 5.3 1.8-5.3 1.8L12 16.7l-1.8-5.3-5.3-1.8 5.3-1.8z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24"' + STROKE + ' stroke-width="2.4"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"' + STROKE + ' stroke-width="3.4"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M6 9l6 6 6-6"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    book: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/></svg>',
    file: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>',
    chart: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/></svg>',
    chat: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>'
  };

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }

  function icon(name, cls) {
    var s = h('span', 'agd-ico' + (cls ? ' ' + cls : ''));
    s.innerHTML = ICON[name] || '';
    return s;
  }

  function nowLabel() {
    var d = new Date();
    var hr = d.getHours();
    return (hr < 12 ? '오전 ' : '오후 ') + (hr % 12 || 12) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function seconds(ms) {
    return ms >= 1000 ? (ms / 1000).toFixed(1) + '초' : ms + 'ms';
  }

  /* 스트리밍 단위 — 인용 [n]과 굵게 표시 **는 한 덩어리로 나온다(반쯤 쓴 "[1"이 보이지 않게) */
  function units(text) {
    return text.match(/\[\d+\]|\*\*|[\s\S]/g) || [];
  }

  /* 한 줄 안의 **굵게** 와 [n] 인용 */
  function inline(parent, text) {
    if ((text.match(/\*\*/g) || []).length % 2 === 1) {
      // 쓰는 중인 굵게: 방금 연 ** 는 숨기고, 내용이 있으면 닫아서 그린다
      text = /\*\*$/.test(text) ? text.slice(0, -2) : text + '**';
    }
    text.split(/(\*\*[\s\S]+?\*\*|\[\d+\])/g).forEach(function (part) {
      if (!part) return;
      var bold = /^\*\*([\s\S]+)\*\*$/.exec(part);
      if (bold) {
        parent.appendChild(h('strong', null, bold[1]));
        return;
      }
      var cite = /^\[(\d+)\]$/.exec(part);
      if (cite) {
        var c = h('span', 'agd-rc-cite', cite[1]);
        c.setAttribute('data-n', cite[1]);
        parent.appendChild(c);
        return;
      }
      parent.appendChild(document.createTextNode(part));
    });
  }

  /* 답 글 — 문단 · "- " 목록 · 굵게 · 인용 (원본 AnswerText) */
  function renderAnswer(box, text) {
    box.textContent = '';
    var list = null;
    text.split('\n').forEach(function (line) {
      var item = /^\s*[-•]\s+(.*)$/.exec(line);
      if (item) {
        if (!list) {
          list = h('ul');
          box.appendChild(list);
        }
        var li = h('li');
        inline(li, item[1]);
        list.appendChild(li);
        return;
      }
      list = null;
      if (line.trim() === '') return;
      var p = h('p');
      inline(p, line);
      box.appendChild(p);
    });
  }

  function citedNumbers(text) {
    var out = [];
    var re = /\[(\d+)\]/g;
    var m;
    while ((m = re.exec(text))) if (out.indexOf(+m[1]) < 0) out.push(+m[1]);
    return out;
  }

  /* 컨테이너 안에서만 스크롤해 el을 보이게 한다(페이지는 그대로) */
  function reveal(container, el) {
    var c = container.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    if (r.top < c.top + 12) container.scrollTop -= c.top + 12 - r.top + 24;
    else if (r.bottom > c.bottom - 12) container.scrollTop += r.bottom - c.bottom + 36;
  }

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var hero = app.hero || {};
    screen.textContent = '';

    /* ---- 뼈대 */
    var root = h('div', 'agd-rc');

    var nav = h('div', 'agd-rc-nav');
    var brand = h('div', 'agd-rc-brand');
    brand.appendChild(icon('sparkle', 'agd-rc-logo'));
    brand.appendChild(h('span', null, app.brand || ''));
    nav.appendChild(brand);
    var menu = h('ul', 'agd-rc-menu');
    (app.menus || []).forEach(function (m) {
      var li = h('li', m.active ? 'is-active' : null);
      li.appendChild(icon(m.icon || 'file'));
      li.appendChild(h('span', null, m.label));
      menu.appendChild(li);
    });
    nav.appendChild(menu);
    root.appendChild(nav);

    var main = h('div', 'agd-rc-main');
    var head = h('div', 'agd-rc-head');
    var headText = h('div', 'agd-rc-headtext');
    headText.appendChild(h('p', 'agd-rc-title', app.screenTitle || ''));
    headText.appendChild(h('p', 'agd-rc-desc', app.screenDesc || ''));
    head.appendChild(headText);
    var newChat = h('span', 'agd-rc-btn');
    newChat.appendChild(icon('pencil'));
    newChat.appendChild(h('span', null, LABEL.newChat));
    head.appendChild(newChat);
    main.appendChild(head);

    var body = h('div', 'agd-rc-body');
    var chat = h('div', 'agd-rc-card agd-rc-chat');
    var msgs = h('div', 'agd-rc-msgs');
    chat.appendChild(msgs);
    var composer = h('div', 'agd-rc-composer');
    var box = h('div', 'agd-rc-inputbox');
    var input = h('span', 'agd-rc-input');
    input.setAttribute('data-placeholder', app.placeholder || '');
    var send = h('span', 'agd-rc-send');
    send.appendChild(icon('arrowUp'));
    box.appendChild(input);
    box.appendChild(send);
    composer.appendChild(box);
    composer.appendChild(h('p', 'agd-rc-hint', app.hint || ''));
    chat.appendChild(composer);
    body.appendChild(chat);

    var side = h('div', 'agd-rc-card agd-rc-side');
    var sideHead = h('div', 'agd-rc-sidehead');
    sideHead.appendChild(h('span', null, LABEL.evidence));
    var count = h('span', 'agd-rc-count');
    sideHead.appendChild(count);
    side.appendChild(sideHead);
    var evList = h('div', 'agd-rc-evlist');
    side.appendChild(evList);
    body.appendChild(side);

    main.appendChild(body);
    root.appendChild(main);
    screen.appendChild(root);

    /* ---- 상태 */
    var state = { input: '', examples: [], turns: null, turn: null };

    function setInput(text) {
      state.input = text;
      input.textContent = text;
      input.classList.toggle('is-empty', text === '');
      send.classList.toggle('is-ready', text !== '');
    }

    function toBottom() {
      msgs.scrollTop = msgs.scrollHeight;
    }

    function renderHero() {
      var wrap = h('div', 'agd-rc-hero');
      var ic = h('span', 'agd-rc-heroicon');
      ic.appendChild(icon('sparkle'));
      wrap.appendChild(ic);
      wrap.appendChild(h('p', 'agd-rc-herotitle', hero.title || ''));
      wrap.appendChild(h('p', 'agd-rc-herodesc', hero.desc || ''));
      wrap.appendChild(h('p', 'agd-rc-herosub', hero.examplesTitle || ''));
      var list = h('ul', 'agd-rc-examples');
      state.examples = [];
      (hero.examples || []).forEach(function (q, i) {
        var li = h('li', 'agd-rc-example', '“' + q + '”');
        li.style.setProperty('--i', i);
        list.appendChild(li);
        state.examples.push(li);
      });
      wrap.appendChild(list);
      msgs.appendChild(wrap);
    }

    function clearEvidence() {
      evList.textContent = '';
      evList.appendChild(h('p', 'agd-rc-evempty', LABEL.evidenceEmpty));
      count.textContent = '';
    }

    function reset() {
      msgs.textContent = '';
      msgs.scrollTop = 0;
      evList.scrollTop = 0;
      state.turns = null;
      state.turn = null;
      body.setAttribute('data-solo', '');
      box.classList.remove('is-focus');
      setInput('');
      clearEvidence();
      renderHero();
    }

    function buildTurn(question) {
      var art = h('div', 'agd-rc-turn');
      var q = h('div', 'agd-rc-q');
      q.appendChild(h('span', 'agd-rc-qavatar', LABEL.you));
      var bubble = h('div', 'agd-rc-qbubble');
      bubble.appendChild(h('p', 'agd-rc-qtext', question));
      bubble.appendChild(h('span', 'agd-rc-qtime', nowLabel()));
      q.appendChild(bubble);
      art.appendChild(q);

      var a = h('div', 'agd-rc-a');
      var ahead = h('div', 'agd-rc-ahead');
      var av = h('span', 'agd-rc-aavatar');
      av.appendChild(icon('sparkle'));
      ahead.appendChild(av);
      ahead.appendChild(h('span', 'agd-rc-aname', LABEL.ai));
      var writing = h('span', 'agd-rc-writing');
      var dots = h('span', 'agd-rc-dots');
      dots.appendChild(h('i'));
      dots.appendChild(h('i'));
      dots.appendChild(h('i'));
      writing.appendChild(dots);
      writing.appendChild(document.createTextNode(LABEL.writing));
      ahead.appendChild(writing);
      var time = h('span', 'agd-rc-atime');
      ahead.appendChild(time);
      a.appendChild(ahead);
      art.appendChild(a);
      return { el: art, a: a, writing: writing, time: time, think: null, thinkTitle: null, steps: null, answer: null, evidence: [], text: '', refs: null };
    }

    function ensureThink(t) {
      if (t.think) return;
      var think = h('div', 'agd-rc-think');
      think.setAttribute('data-open', '');
      var thead = h('div', 'agd-rc-thinkhead');
      thead.appendChild(icon('sparkle', 'agd-rc-thinkicon'));
      t.thinkTitle = h('span', 'agd-rc-thinktitle');
      thead.appendChild(t.thinkTitle);
      thead.appendChild(icon('chevron', 'agd-rc-chev'));
      think.appendChild(thead);
      var wrap = h('div', 'agd-rc-stepswrap');
      var clip = h('div', 'agd-rc-stepsclip');
      t.steps = h('ol', 'agd-rc-steps');
      clip.appendChild(t.steps);
      wrap.appendChild(clip);
      think.appendChild(wrap);
      t.a.appendChild(think);
      t.think = think;
    }

    function completeStep(li) {
      li.setAttribute('data-s', 'done');
      var ic = li.querySelector('.agd-rc-stepicon');
      ic.textContent = '';
      ic.appendChild(icon('check'));
      var ms = +li.getAttribute('data-ms');
      if (ms) li.querySelector('.agd-rc-steptitle').appendChild(h('span', 'agd-rc-steptime', seconds(ms)));
      var detail = li.getAttribute('data-detail');
      if (detail) li.querySelector('.agd-rc-steptext').appendChild(h('span', 'agd-rc-stepdetail', detail));
    }

    function buildCard(e) {
      var card = h('div', 'agd-rc-ev');
      card.setAttribute('data-n', e.n);
      var top = h('div', 'agd-rc-evhead');
      top.appendChild(h('span', 'agd-rc-evno', e.n));
      if (e.kind === 'TOOL') top.appendChild(h('span', 'agd-rc-tag', LABEL.source.TOOL));
      card.appendChild(top);
      card.appendChild(h('p', 'agd-rc-evtitle', e.doc));
      card.appendChild(h('p', 'agd-rc-evwhere', e.where + (e.page ? ' · ' + LABEL.page(e.page) : '')));
      // 세 줄 자르기는 여백 없는 안쪽 글 상자에 건다(여백에 넷째 줄이 비치지 않게) · 줄바꿈은 pre-line
      var text = h('div', 'agd-rc-evbody');
      text.appendChild(h('p', 'agd-rc-evtext', String(e.body || '')));
      card.appendChild(text);
      var acts = h('div', 'agd-rc-evactions');
      acts.appendChild(h('span', 'agd-rc-btn is-ghost', LABEL.expand));
      if (e.page) acts.appendChild(h('span', 'agd-rc-btn', LABEL.openOriginal));
      card.appendChild(acts);
      return card;
    }

    /* 답 아래 "답에 인용한 근거" — 규정별 한 줄(규정명 한 번 + 번호 · 쪽 칩) */
    function buildRefs(t) {
      var cited = citedNumbers(t.text);
      var items = t.evidence.filter(function (e) { return cited.indexOf(e.n) >= 0; });
      if (items.length === 0) return;
      var wrap = h('div', 'agd-rc-refs');
      wrap.appendChild(h('span', 'agd-rc-refslabel', LABEL.refsCited(items.length)));
      var groups = [];
      items.forEach(function (e) {
        var g = null;
        for (var i = 0; i < groups.length; i++) if (groups[i].doc === e.doc) g = groups[i];
        if (!g) {
          g = { doc: e.doc, items: [] };
          groups.push(g);
        }
        g.items.push(e);
      });
      groups.forEach(function (g) {
        var row = h('div', 'agd-rc-refgroup');
        row.appendChild(h('span', 'agd-rc-reftitle', g.doc));
        g.items.forEach(function (e) {
          var chip = h('span', 'agd-rc-ref');
          chip.setAttribute('data-n', e.n);
          chip.appendChild(h('span', 'agd-rc-refno', e.n));
          if (e.page) chip.appendChild(h('span', null, LABEL.page(e.page)));
          row.appendChild(chip);
        });
        wrap.appendChild(row);
      });
      t.a.appendChild(wrap);
      t.refs = wrap;
    }

    var actions = {
      /* 예시 질문 카드를 눌러 입력 상자에 넣는다(원본 pick) */
      pick: function (a, ctx) {
        var q = (hero.examples || [])[a.index] || '';
        setInput(q);
        box.classList.add('is-focus');
        return ctx.sleep(a.hold || 450);
      },

      /* 입력 상자에 직접 타이핑 */
      type: function (a, ctx) {
        box.classList.add('is-focus');
        if (ctx.instant) {
          setInput(a.text);
          return null;
        }
        var u = units(a.text);
        var i = 0;
        var delay = 1000 / (a.cps || 14);
        function next() {
          i += 1;
          setInput(u.slice(0, i).join(''));
          return i >= u.length ? ctx.sleep(a.hold || 350) : ctx.sleep(delay).then(next);
        }
        return next();
      },

      /* 보내기 — 질문 말풍선 + 답 카드(작성 중). 근거 패널은 이번 답 기준으로 비운다 */
      send: function () {
        var question = state.input;
        setInput('');
        box.classList.remove('is-focus');
        if (!state.turns) {
          msgs.textContent = '';
          state.turns = h('div', 'agd-rc-turns');
          msgs.appendChild(state.turns);
        }
        body.removeAttribute('data-solo');
        clearEvidence();
        var t = buildTurn(question);
        state.turns.appendChild(t.el);
        state.turn = t;
        toBottom();
      },

      /* 처리 과정 한 단계 — 진행 중 → 끝(소요 시간 · 상세). open이면 진행 중으로 두고 finish가 끝낸다 */
      step: function (a, ctx) {
        var t = state.turn;
        if (!t) return null;
        ensureThink(t);
        var li = h('li', 'agd-rc-step');
        li.setAttribute('data-s', 'run');
        li.setAttribute('data-ms', a.ms || 0);
        if (a.detail) li.setAttribute('data-detail', a.detail);
        li.appendChild(h('span', 'agd-rc-stepicon'));
        var text = h('span', 'agd-rc-steptext');
        text.appendChild(h('span', 'agd-rc-steptitle', a.label));
        li.appendChild(text);
        t.steps.appendChild(li);
        t.thinkTitle.textContent = LABEL.running(a.label);
        toBottom();
        if (a.open) return null;
        return ctx.sleep(a.dur || 700).then(function () {
          completeStep(li);
          toBottom();
        });
      },

      /* 근거 카드를 차례로 */
      evidence: function (a, ctx) {
        var t = state.turn;
        var items = a.items || [];
        if (t) t.evidence = items;
        evList.textContent = '';
        var i = 0;
        function next() {
          if (i >= items.length) return null;
          evList.appendChild(buildCard(items[i]));
          i += 1;
          count.textContent = String(i);
          return ctx.sleep(a.stagger || 220).then(next);
        }
        return next();
      },

      /* 답 글자 스트리밍(캐럿 깜빡임) */
      stream: function (a, ctx) {
        var t = state.turn;
        if (!t) return null;
        t.text = a.text;
        t.answer = h('div', 'agd-rc-md is-caret');
        t.a.appendChild(t.answer);
        if (ctx.instant) {
          renderAnswer(t.answer, a.text);
          return null;
        }
        var u = units(a.text);
        var per = a.chunk || 2;
        var delay = (1000 / (a.cps || 40)) * per;
        var i = 0;
        function next() {
          i = Math.min(i + per, u.length);
          renderAnswer(t.answer, u.slice(0, i).join(''));
          toBottom();
          return i >= u.length ? null : ctx.sleep(delay).then(next);
        }
        return next();
      },

      /* 끝 — 처리 과정을 한 줄로 접고 · 걸린 시간 · 답에 인용한 근거 칩 */
      finish: function (a) {
        var t = state.turn;
        if (!t) return null;
        if (t.answer) t.answer.classList.remove('is-caret');
        if (t.writing.parentNode) t.writing.parentNode.removeChild(t.writing);
        t.time.textContent = seconds(a.ms || 0);
        if (t.think) {
          var running = t.steps.querySelectorAll('[data-s="run"]');
          for (var i = 0; i < running.length; i++) completeStep(running[i]);
          t.think.setAttribute('data-state', 'DONE');
          t.think.removeAttribute('data-open');
          t.thinkTitle.textContent = LABEL.done(t.steps.querySelectorAll('[data-s="done"]').length, a.ms || 0);
        }
        buildRefs(t);
        toBottom();
        return null;
      },

      /* 답 속 인용 번호를 눌렀다 — 그 번호의 근거 카드 · 칩을 강조 */
      cite: function (a) {
        var t = state.turn;
        if (!t) return null;
        var n = String(a.n);
        var marks = t.a.querySelectorAll('.agd-rc-cite, .agd-rc-ref');
        for (var i = 0; i < marks.length; i++) marks[i].classList.toggle('is-on', marks[i].getAttribute('data-n') === n);
        var cards = evList.querySelectorAll('.agd-rc-ev');
        for (var j = 0; j < cards.length; j++) {
          if (cards[j].getAttribute('data-n') === n) {
            cards[j].setAttribute('data-selected', '');
            reveal(evList, cards[j]);
          } else {
            cards[j].removeAttribute('data-selected');
          }
        }
        return null;
      }
    };

    function target(key) {
      var parts = String(key).split(':');
      if (parts[0] === 'example') return state.examples[+parts[1]] || null;
      if (parts[0] === 'input') return box;
      if (parts[0] === 'send') return send;
      if (parts[0] === 'cite' && state.turn && state.turn.answer) {
        var chip = state.turn.answer.querySelector('.agd-rc-cite[data-n="' + parts[1] + '"]');
        if (chip) reveal(msgs, chip);
        return chip;
      }
      return null;
    }

    return { reset: reset, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('rag-chat', { mount: mount });
})(window, document);
