/*
 * 화면 유형 'kcomwel-opinion' — AI 재해조사 어시스턴트 · 심사의견서(포트폴리오 설계 0003 §3-2)
 * 원본 화면(시험 환경 캡처)의 구조 · 문구를 재구성했다. 업무 포털 바깥 틀(로고 · 상단 탭)은 그리지 않는다.
 *   위: 제품 머리줄 · 왼쪽 메뉴 · 화면 제목 · 접수번호 줄([생성])
 *   가운데: "AI 심사의견서" · 단계 표시줄(app.steps, 마지막은 미리보기)
 *   본문: 왼쪽 "<단계> (자동 조회 데이터)" 표 | 오른쪽 "<단계> (보고서 작성용)" 본문 + [복사] [수정]
 *         마지막 단계는 미리보기(서식 · 복사 · 인쇄)
 *   배치: lg · md는 좌우 2단(칸마다 안쪽 스크롤), sm은 한 단(본문 스크롤)
 * 화면 내용은 모두 각본 데이터(app)에서 온다. 머리줄 · 메뉴 · 접수번호 줄 · 단계 표시는 kcomwel-assist와 같은 클래스다.
 *
 * 각본 동작(actions): type · generate · focus · step · edit · save · copy · scrollPreview · print
 * 커서 목표(target): 'receipt' · 'run' · 'step:<i>' · 'source' · 'draft' · 'edit' · 'save' · 'copy' · 'print'
 * 기다림은 ctx.sleep만 쓴다(일시정지 · 취소를 따른다). 모든 동작은 ctx.instant에서 최종 상태를 바로 그린다.
 * 글은 textContent로만 넣는다. 안쪽 스크롤 상자만 움직이고 페이지 스크롤은 건드리지 않는다.
 */
(function (window, document) {
  'use strict';
  if (!window.AgentDemo || !window.AgentDemo.util) return;

  var U = window.AgentDemo.util;
  var h = U.h;
  var icon = U.icon;

  var S = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  U.addIcons({
    kwMenu: '<svg viewBox="0 0 24 24"' + S + '><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    kwPrint: '<svg viewBox="0 0 24 24"' + S + '><path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2"/><path d="M7 14h10v6H7z"/></svg>'
  });

  /* 원본 화면 문구 */
  var L = {
    receiptHint: '접수번호',
    source: ' (자동 조회 데이터)',
    draft: ' (보고서 작성용)',
    copy: '복사',
    edit: '수정',
    save: '저장',
    cancel: '취소',
    print: '인쇄',
    empty: '접수번호를 넣고 [심사의견서 생성]을 누르면 단계별 초안을 만듭니다.',
    copied: '복사되었습니다. 업무 시스템에 붙여 넣을 수 있습니다.',
    saved: '수정한 내용을 저장했습니다.',
    printing: '인쇄 창을 엽니다.'
  };

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var steps = app.steps || [];
    var last = steps.length - 1; // 마지막 단계는 미리보기
    var pv = app.preview || {};
    var v = {};

    function btn(cls, ico, text) {
      var b = h('span', 'agd-kw-btn' + (cls ? ' ' + cls : ''));
      if (ico) b.appendChild(icon(ico));
      if (text) b.appendChild(h('span', null, text));
      return b;
    }

    function build() {
      screen.textContent = '';
      v = { cur: -1, added: {}, ready: false };
      var root = h('div', 'agd-k agd-kw is-opinion');

      var top = h('div', 'agd-kw-top');
      top.appendChild(icon('kwMenu', 'agd-kw-topico'));
      top.appendChild(h('span', 'agd-kw-product', app.product || ''));
      root.appendChild(top);

      var frame = h('div', 'agd-kw-frame');
      var menu = h('ul', 'agd-kw-menu');
      (app.menus || []).forEach(function (m, i) {
        menu.appendChild(h('li', i === app.activeMenu ? 'is-active' : null, m));
      });
      frame.appendChild(menu);

      var main = h('div', 'agd-kw-main');
      main.appendChild(h('p', 'agd-kw-title', app.pageTitle || ''));

      var band = h('div', 'agd-kw-band');
      var input = h('span', 'agd-kw-input');
      var inputText = h('span', 'agd-kw-inputtext is-hint', L.receiptHint);
      input.appendChild(inputText);
      band.appendChild(input);
      var run = btn('is-run', 'sparkle', app.runLabel || '');
      band.appendChild(run);
      main.appendChild(band);

      // 섹션 제목 · 단계 표시
      var fixed = h('div', 'agd-kw-fixed');
      fixed.appendChild(h('p', 'agd-kw-sec', app.sectionTitle || ''));
      var bar = h('div', 'agd-kw-steps');
      var stepEls = steps.map(function (st, i) {
        var s = h('div', 'agd-kw-step');
        s.appendChild(h('span', 'agd-kw-num', String(i + 1)));
        s.appendChild(h('span', 'agd-kw-steplabel', st.label));
        var mark = h('span', 'agd-kw-stepmark');
        mark.appendChild(icon('check'));
        s.appendChild(mark);
        bar.appendChild(s);
        return s;
      });
      fixed.appendChild(bar);
      main.appendChild(fixed);

      // 본문
      var body = h('div', 'agd-kw-obody');
      var empty = h('p', 'agd-kw-empty', L.empty);
      body.appendChild(empty);

      var panes = h('div', 'agd-kw-opanes is-hidden');
      var src = h('div', 'agd-kw-opane');
      var srcHead = h('div', 'agd-kw-ohead');
      var srcTitle = h('p', 'agd-kw-otitle', '');
      srcHead.appendChild(srcTitle);
      src.appendChild(srcHead);
      var srcBody = h('div', 'agd-kw-opbody');
      src.appendChild(srcBody);
      panes.appendChild(src);

      var dr = h('div', 'agd-kw-opane is-draft');
      var drHead = h('div', 'agd-kw-ohead');
      var drTitle = h('p', 'agd-kw-otitle', '');
      drHead.appendChild(drTitle);
      var acts = h('div', 'agd-kw-oacts');
      var copy = btn(null, 'copy', L.copy);
      var edit = btn(null, 'pencil', L.edit);
      var cancel = btn('is-hidden', null, L.cancel);
      var save = btn('is-primary is-hidden', 'save', L.save);
      acts.appendChild(copy);
      acts.appendChild(edit);
      acts.appendChild(cancel);
      acts.appendChild(save);
      drHead.appendChild(acts);
      dr.appendChild(drHead);
      var drBody = h('div', 'agd-kw-opbody');
      var text = h('p', 'agd-kw-otext');
      drBody.appendChild(text);
      dr.appendChild(drBody);
      panes.appendChild(dr);
      body.appendChild(panes);

      // 마지막 단계 — 미리보기
      var prev = h('div', 'agd-kw-opreview is-hidden');
      var pHead = h('div', 'agd-kw-ohead');
      pHead.appendChild(h('p', 'agd-kw-otitle', pv.title || ''));
      var pActs = h('div', 'agd-kw-oacts');
      pActs.appendChild(btn(null, 'copy', L.copy));
      var pPrint = btn(null, 'kwPrint', L.print);
      pActs.appendChild(pPrint);
      pHead.appendChild(pActs);
      prev.appendChild(pHead);
      var pBody = h('div', 'agd-kw-opbody');
      var paper = h('div', 'agd-kw-paper');
      pBody.appendChild(paper);
      prev.appendChild(pBody);
      body.appendChild(prev);

      main.appendChild(body);
      frame.appendChild(main);
      root.appendChild(frame);
      screen.appendChild(root);

      v.input = input;
      v.inputText = inputText;
      v.run = run;
      v.steps = stepEls;
      v.body = body;
      v.empty = empty;
      v.panes = panes;
      v.src = src;
      v.srcTitle = srcTitle;
      v.srcBody = srcBody;
      v.dr = dr;
      v.drTitle = drTitle;
      v.drBody = drBody;
      v.text = text;
      v.copy = copy;
      v.edit = edit;
      v.cancel = cancel;
      v.save = save;
      v.prev = prev;
      v.pBody = pBody;
      v.paper = paper;
      v.pPrint = pPrint;
    }

    /* 그 요소를 품은 스크롤 상자 — lg · md는 칸 본문(.agd-kw-opbody), sm은 본문 전체 */
    function scroller(el) {
      var box = el && el.closest ? el.closest('.agd-kw-opbody') : null;
      if (box && window.getComputedStyle(box).overflowY !== 'visible') return box;
      return v.body;
    }

    function show(el) {
      if (el) U.reveal(scroller(el), el);
    }

    function setStep(i, state) {
      var s = v.steps[i];
      if (!s) return;
      if (state === 'run' || state === 'done') {
        s.classList.toggle('is-running', state === 'run');
        s.classList.toggle('is-done', state === 'done');
      }
    }

    function activate(i) {
      v.steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    }

    /* 자동 조회 데이터 표 — 묶음 { group, rows:[[라벨, 값]] } 또는 한 줄 [라벨, 값] */
    function sourceTable(rows) {
      var grouped = rows.some(function (r) { return !Array.isArray(r); });
      var t = h('div', 'agd-kw-otable' + (grouped ? '' : ' is-flat'));
      var cells = [];
      rows.forEach(function (r) {
        if (Array.isArray(r)) {
          var lab = h('span', 'agd-kw-oth' + (grouped ? ' is-span' : ''), r[0]);
          var val = h('span', 'agd-kw-otd', r[1]);
          t.appendChild(lab);
          t.appendChild(val);
          cells.push([lab, val]);
          return;
        }
        var g = h('span', 'agd-kw-ogroup');
        String(r.group).split('\n').forEach(function (p, k) {
          g.appendChild(h('span', k ? 'agd-kw-ogsub' : null, p));
        });
        g.style.gridRow = 'span ' + r.rows.length;
        t.appendChild(g);
        r.rows.forEach(function (rr, k) {
          var l = h('span', 'agd-kw-oth', rr[0]);
          var d = h('span', 'agd-kw-otd', rr[1]);
          t.appendChild(l);
          t.appendChild(d);
          cells.push(k === 0 ? [g, l, d] : [l, d]);
        });
      });
      return { el: t, cells: cells };
    }

    function paintText(i) {
      v.text.textContent = '';
      v.text.appendChild(document.createTextNode(steps[i].text || ''));
      if (v.added[i]) v.text.appendChild(h('span', 'agd-kw-added', v.added[i]));
    }

    /* 단계 i의 두 칸을 채운다 — rowsIn이면 표 행을 숨겨 두고 돌려준다(차례로 보이게) */
    function fillPanes(i, hidden) {
      var st = steps[i];
      v.srcTitle.textContent = st.label + L.source;
      v.drTitle.textContent = st.label + L.draft;
      v.srcBody.textContent = '';
      var t = sourceTable(st.source || []);
      v.srcBody.appendChild(t.el);
      t.cells.forEach(function (r) { r.forEach(function (c) { c.classList.toggle('is-in', !hidden); }); });
      v.srcBody.scrollTop = 0;
      v.drBody.scrollTop = 0;
      v.text.classList.remove('is-editing');
      v.copy.classList.remove('is-done');
      if (!hidden) paintText(i);
      return t.cells;
    }

    function fillPaper() {
      v.paper.textContent = '';
      v.paper.appendChild(h('p', 'agd-kw-doctitle', pv.docTitle || ''));
      if (pv.meta) {
        var meta = h('p', 'agd-kw-docmeta');
        meta.appendChild(h('span', null, pv.meta[0] + ' '));
        meta.appendChild(h('strong', null, pv.meta[1]));
        v.paper.appendChild(meta);
      }
      for (var i = 0; i < last; i++) {
        var sec = h('div', 'agd-kw-docsec');
        sec.setAttribute('data-i', String(i));
        sec.appendChild(h('p', 'agd-kw-doclabel', (i + 1) + '. ' + steps[i].label));
        var q = h('p', 'agd-kw-docquote');
        q.appendChild(document.createTextNode(steps[i].text || ''));
        if (v.added[i]) q.appendChild(h('span', 'agd-kw-added', v.added[i]));
        sec.appendChild(q);
        v.paper.appendChild(sec);
      }
    }

    function stream(el, text, every, ctx, chunk) {
      if (ctx.instant || !every) {
        el.textContent = text;
        return Promise.resolve();
      }
      var n = 0;
      var size = chunk || 2;
      function tick() {
        n = Math.min(text.length, n + size);
        el.textContent = text.slice(0, n);
        if (n >= text.length) return Promise.resolve();
        return ctx.sleep(every).then(tick);
      }
      return tick();
    }

    var actions = {
      type: function (s, ctx) {
        v.input.classList.add('is-focus');
        v.inputText.classList.remove('is-hint');
        return stream(v.inputText, s.text || app.receiptNo || '', s.every || 55, ctx, 1).then(function () {
          v.input.classList.remove('is-focus');
        });
      },

      /* 심사의견서 생성 — 1단계 표 · 본문이 채워지고, 나머지 단계가 차례로 체크된다 */
      generate: function (s, ctx) {
        v.run.classList.add('is-busy');
        v.empty.classList.add('is-hidden');
        v.panes.classList.remove('is-hidden');
        v.cur = 0;
        activate(0);
        setStep(0, 'run');
        var rows = fillPanes(0, true);
        var i = 0;
        function rowIn() {
          if (i >= rows.length) return Promise.resolve();
          rows[i].forEach(function (c) { c.classList.add('is-in'); });
          i += 1;
          return ctx.sleep(s.every || 60).then(rowIn);
        }
        v.text.textContent = '';
        v.dr.classList.add('is-writing');
        return ctx.sleep(s.ms || 500)
          .then(rowIn)
          .then(function () { return stream(v.text, steps[0].text || '', s.write || 30, ctx, 2); })
          .then(function () {
            v.dr.classList.remove('is-writing');
            paintText(0);
            setStep(0, 'done');
            var k = 1;
            function nextStep() {
              if (k > last) return Promise.resolve();
              var idx = k;
              k += 1;
              setStep(idx, 'run');
              return ctx.sleep(s.tick || 380).then(function () {
                setStep(idx, 'done');
                return nextStep();
              });
            }
            return nextStep();
          })
          .then(function () {
            v.run.classList.remove('is-busy');
            v.ready = true;
          });
      },

      /* 칸 강조 — pane: source · draft, 없으면 해제 */
      focus: function (s) {
        v.src.classList.toggle('is-focus', s.pane === 'source');
        v.dr.classList.toggle('is-focus', s.pane === 'draft');
        return Promise.resolve();
      },

      /* 단계 이동 — 마지막 단계는 미리보기 */
      step: function (s, ctx) {
        var i = s.index;
        if (!steps[i]) return Promise.resolve();
        v.cur = i;
        activate(i);
        v.src.classList.remove('is-focus');
        v.dr.classList.remove('is-focus');
        v.empty.classList.add('is-hidden');
        if (i === last) {
          fillPaper();
          v.panes.classList.add('is-hidden');
          v.prev.classList.remove('is-hidden');
          v.pBody.scrollTop = 0;
          v.body.scrollTop = 0;
          return Promise.resolve();
        }
        v.prev.classList.add('is-hidden');
        v.panes.classList.remove('is-hidden');
        fillPanes(i, false);
        v.body.scrollTop = 0;
        if (!ctx.instant) {
          v.panes.classList.remove('is-swap');
          void v.panes.offsetWidth; // 애니메이션을 다시 걸기 위한 리플로
          v.panes.classList.add('is-swap');
        }
        return Promise.resolve();
      },

      /* 지금 단계 본문 수정 — 편집 상자로 바뀌고 문장을 덧붙인다 */
      edit: function (s, ctx) {
        var i = v.cur;
        if (i < 0 || i === last) return Promise.resolve();
        v.text.classList.add('is-editing');
        v.copy.classList.add('is-hidden');
        v.edit.classList.add('is-hidden');
        v.cancel.classList.remove('is-hidden');
        v.save.classList.remove('is-hidden');
        var add = s.append || '';
        paintText(i);
        var span = h('span', 'agd-kw-added');
        v.text.appendChild(span);
        return stream(span, add, s.every || 40, ctx, 1).then(function () {
          v.added[i] = add;
        });
      },

      save: function (s, ctx) {
        v.text.classList.remove('is-editing');
        v.copy.classList.remove('is-hidden');
        v.edit.classList.remove('is-hidden');
        v.cancel.classList.add('is-hidden');
        v.save.classList.add('is-hidden');
        if (v.cur >= 0 && v.cur < last) paintText(v.cur);
        U.toast(screen, L.saved, { tone: 'success', ms: 1800 }, ctx);
        return Promise.resolve();
      },

      copy: function (s, ctx) {
        v.copy.classList.add('is-done');
        U.toast(screen, L.copied, { tone: 'success', ms: 2000 }, ctx);
        return Promise.resolve();
      },

      /* 미리보기 안에서 그 단계 위치로 부드럽게 내린다 */
      scrollPreview: function (s, ctx) {
        var sec = v.paper.querySelector('[data-i="' + (s.index || 0) + '"]');
        if (!sec) return Promise.resolve();
        var box = scroller(sec);
        var goal = box.scrollTop + sec.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
        goal = Math.max(0, Math.min(goal, box.scrollHeight - box.clientHeight));
        if (ctx.instant) {
          box.scrollTop = goal;
          return Promise.resolve();
        }
        var from = box.scrollTop;
        var n = 0;
        var total = 12;
        function tick() {
          n += 1;
          var t = n / total;
          box.scrollTop = from + (goal - from) * (1 - Math.pow(1 - t, 3));
          if (n >= total) return Promise.resolve();
          return ctx.sleep(30).then(tick);
        }
        return tick();
      },

      print: function (s, ctx) {
        U.toast(screen, L.printing, { tone: 'info', ms: 2000 }, ctx);
        return Promise.resolve();
      }
    };

    function reset() {
      build();
    }

    /* 커서 목표 — 보이지 않으면 null(엔진이 그 커서 장면을 건너뛴다) */
    function target(key) {
      var p = String(key).split(':');
      var el = null;
      if (key === 'receipt') el = v.input;
      else if (key === 'run') el = v.run;
      else if (key === 'source') el = v.srcTitle;
      else if (key === 'draft') el = v.drTitle;
      else if (key === 'edit') el = v.edit;
      else if (key === 'save') el = v.save;
      else if (key === 'copy') el = v.copy;
      else if (key === 'print') el = v.pPrint;
      else if (p[0] === 'step') el = v.steps[+p[1]] || null;
      if (!el || el.offsetParent === null) return null;
      if (el.closest && el.closest('.agd-kw-obody')) show(el); // 단계 표시줄은 본문 밖(고정)이라 스크롤하지 않는다
      return el;
    }

    build();
    return { reset: reset, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('kcomwel-opinion', { mount: mount });
})(window, document);
