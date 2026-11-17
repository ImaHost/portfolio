/*
 * 화면 유형 'kcomwel-assist' — AI 재해조사 어시스턴트 문서 작성 화면(포트폴리오 설계 0002 §3-2)
 * 원본 화면(재해조사보고서 · 불승인공문)의 구조 · 문구를 재구성했다. 업무 포털 바깥 틀(로고 · 상단 탭)은 그리지 않는다.
 *   위: 제품 머리줄 · 왼쪽 메뉴 · 화면 제목 · 접수번호 줄([작성] 버튼)
 *   가운데: 섹션 제목 · 단계 표시(app.steps가 있을 때) · 접수 데이터 표(app.intake) → 항목 카드(AI 초안 | AI 가이드)
 *   덮개: 미리보기(서식 · 복사 · 인쇄)
 * 화면 내용은 모두 각본 데이터(app)에서 온다 — 같은 렌더러로 다른 문서(불승인공문 등)를 그릴 수 있다.
 *
 * 각본 동작(actions): type · lookup · generate · guide · edit · save · copy · preview · scrollPreview · print
 * 커서 목표(target): 'receipt' · 'run' · 'preview' · 'print' · 'guide:<i>' · 'edit:<i>' · 'save:<i>' · 'copy:<i>'
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
    kwSearch: '<svg viewBox="0 0 24 24"' + S + '><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    kwPrint: '<svg viewBox="0 0 24 24"' + S + '><path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2"/><path d="M7 14h10v6H7z"/></svg>'
  });

  /* 원본 화면 문구 */
  var L = {
    receiptHint: '접수번호',
    copy: '복사',
    edit: '수정',
    save: '저장',
    cancel: '취소',
    preview: '미리보기',
    print: '인쇄',
    close: '닫기',
    guide: '가이드',
    refPrefix: '참조 : ',
    writing: 'AI 작성 중',
    empty: '접수번호를 입력하고 작성 버튼을 누르세요.',
    copied: '복사되었습니다. 업무 시스템에 붙여 넣을 수 있습니다.',
    saved: '수정한 내용을 저장했습니다.',
    printing: '인쇄 창을 엽니다.'
  };

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var items = app.items || [];
    var steps = app.steps || null;
    var intake = app.intake || null;
    var pv = app.preview || {};
    var v = {}; // 지금 그려진 요소들(reset마다 새로 만든다)

    function btn(cls, ico, text) {
      var b = h('span', 'agd-kw-btn' + (cls ? ' ' + cls : ''));
      if (ico) b.appendChild(icon(ico));
      if (text) b.appendChild(h('span', null, text));
      return b;
    }

    function build() {
      screen.textContent = '';
      v = { items: [], texts: items.map(function (it) { return it.text; }), added: {} };
      var root = h('div', 'agd-k agd-kw');

      // 제품 머리줄
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

      // 접수번호 줄
      var band = h('div', 'agd-kw-band');
      var input = h('span', 'agd-kw-input');
      var inputText = h('span', 'agd-kw-inputtext is-hint', L.receiptHint);
      input.appendChild(inputText);
      band.appendChild(input);
      var run = btn('is-run', 'sparkle', app.runLabel || '');
      band.appendChild(run);
      var pvBtn = btn('is-preview is-disabled', 'kwSearch', L.preview);
      main.appendChild(band);

      // 섹션 제목 · 단계 표시
      var fixed = h('div', 'agd-kw-fixed');
      fixed.appendChild(h('p', 'agd-kw-sec', app.sectionTitle || ''));
      var stepEls = [];
      if (steps) {
        var bar = h('div', 'agd-kw-steps');
        steps.forEach(function (label, i) {
          var s = h('div', 'agd-kw-step');
          s.appendChild(h('span', 'agd-kw-num', String(i + 1)));
          s.appendChild(h('span', 'agd-kw-steplabel', label));
          var mark = h('span', 'agd-kw-stepmark');
          mark.appendChild(icon('check'));
          s.appendChild(mark);
          bar.appendChild(s);
          stepEls.push(s);
        });
        bar.appendChild(pvBtn);
        fixed.appendChild(bar);
      } else {
        band.appendChild(pvBtn);
      }
      main.appendChild(fixed);

      // 본문(안쪽 스크롤)
      var body = h('div', 'agd-kw-body');
      var empty = h('p', 'agd-kw-empty', L.empty);
      body.appendChild(empty);

      var intakeBox = null;
      var rows = [];
      if (intake) {
        intakeBox = h('div', 'agd-kw-intake is-hidden');
        intakeBox.appendChild(h('p', 'agd-kw-subsec', app.intakeTitle || ''));
        var table = h('div', 'agd-kw-table');
        intake.forEach(function (r) {
          var cells = [];
          for (var c = 0; c < r.length; c += 2) {
            var lab = h('span', 'agd-kw-th', r[c]);
            var val = h('span', 'agd-kw-td' + (r.length === 2 ? ' is-wide' : ''), r[c + 1]);
            table.appendChild(lab);
            table.appendChild(val);
            cells.push(lab, val);
          }
          rows.push(cells);
        });
        intakeBox.appendChild(table);
        body.appendChild(intakeBox);
      }

      var list = h('div', 'agd-kw-items');
      items.forEach(function (it, i) {
        var card = h('div', 'agd-kw-item is-hidden');
        var head = h('div', 'agd-kw-itemhead');
        head.appendChild(h('span', null, (i + 1) + '. ' + it.title));
        head.appendChild(icon('chevron', 'agd-kw-fold'));
        card.appendChild(head);
        var ibody = h('div', 'agd-kw-itembody');
        var draft = h('div', 'agd-kw-draft');
        var text = h('p', 'agd-kw-text');
        draft.appendChild(text);
        var acts = h('div', 'agd-kw-acts');
        var copy = btn(null, 'copy', L.copy);
        var edit = btn(null, 'pencil', L.edit);
        var cancel = btn('is-hidden', null, L.cancel);
        var save = btn('is-primary is-hidden', 'save', L.save);
        acts.appendChild(copy);
        acts.appendChild(edit);
        acts.appendChild(cancel);
        acts.appendChild(save);
        draft.appendChild(acts);
        ibody.appendChild(draft);
        var guide = h('div', 'agd-kw-guide');
        var gh = h('p', 'agd-kw-guidehead');
        gh.appendChild(h('span', 'agd-kw-ai', 'AI'));
        gh.appendChild(h('span', null, L.guide));
        guide.appendChild(gh);
        guide.appendChild(h('p', 'agd-kw-guidedesc', (it.guide && it.guide.desc) || ''));
        var ref = h('p', 'agd-kw-guideref', L.refPrefix + ((it.guide && it.guide.ref) || ''));
        guide.appendChild(ref);
        ibody.appendChild(guide);
        card.appendChild(ibody);
        list.appendChild(card);
        v.items.push({ card: card, text: text, copy: copy, edit: edit, cancel: cancel, save: save, guide: guide, ref: ref });
      });
      body.appendChild(list);
      main.appendChild(body);
      frame.appendChild(main);
      root.appendChild(frame);

      // 미리보기 덮개
      var modal = h('div', 'agd-kw-modal is-hidden');
      var dialog = h('div', 'agd-kw-dialog');
      var dhead = h('div', 'agd-kw-dhead');
      dhead.appendChild(h('p', 'agd-kw-dtitle', pv.title || ''));
      var pvCopy = btn(null, 'copy', L.copy);
      var pvPrint = btn(null, 'kwPrint', L.print);
      dhead.appendChild(pvCopy);
      dhead.appendChild(pvPrint);
      dhead.appendChild(icon('close', 'agd-kw-dclose'));
      dialog.appendChild(dhead);
      var dbody = h('div', 'agd-kw-dbody');
      var paper = h('div', 'agd-kw-paper');
      dbody.appendChild(paper);
      dialog.appendChild(dbody);
      var dfoot = h('div', 'agd-kw-dfoot');
      dfoot.appendChild(btn('is-primary', null, L.close));
      dialog.appendChild(dfoot);
      modal.appendChild(dialog);
      root.appendChild(modal);

      screen.appendChild(root);
      v.root = root;
      v.inputText = inputText;
      v.input = input;
      v.run = run;
      v.pvBtn = pvBtn;
      v.steps = stepEls;
      v.body = body;
      v.empty = empty;
      v.intakeBox = intakeBox;
      v.rows = rows;
      v.modal = modal;
      v.dbody = dbody;
      v.paper = paper;
      v.pvPrint = pvPrint;
    }

    function setStep(i, state) {
      var s = v.steps[i];
      if (!s) return;
      s.classList.toggle('is-active', state === 'run' || state === 'done-active');
      s.classList.toggle('is-running', state === 'run');
      s.classList.toggle('is-done', state === 'done' || state === 'done-active');
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
      if (pv.heading) v.paper.appendChild(h('p', 'agd-kw-dochead', pv.heading));
      if (pv.sub) v.paper.appendChild(h('p', 'agd-kw-docsub', pv.sub));
      items.forEach(function (it, i) {
        var sec = h('div', 'agd-kw-docsec');
        sec.setAttribute('data-i', String(i));
        sec.appendChild(h('p', 'agd-kw-doclabel', it.previewLabel || it.title));
        sec.appendChild(h('p', 'agd-kw-docquote', v.texts[i]));
        v.paper.appendChild(sec);
      });
    }

    /* 항목 글 — 원문 + (수정했으면) 덧붙인 문장을 표시 */
    function paintText(i) {
      var it = v.items[i];
      it.text.textContent = '';
      it.text.appendChild(document.createTextNode(items[i].text));
      if (v.added[i]) it.text.appendChild(h('span', 'agd-kw-added', v.added[i]));
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
      /* 접수번호 입력 */
      type: function (s, ctx) {
        v.input.classList.add('is-focus');
        v.inputText.classList.remove('is-hint');
        return stream(v.inputText, s.text || app.receiptNo || '', s.every || 55, ctx, 1).then(function () {
          v.input.classList.remove('is-focus');
        });
      },

      /* 1단계 재해정보 조회 — 접수 데이터 표가 한 줄씩 */
      lookup: function (s, ctx) {
        v.empty.classList.add('is-hidden');
        setStep(0, 'run');
        v.run.classList.add('is-busy');
        if (!v.intakeBox) return Promise.resolve();
        v.intakeBox.classList.remove('is-hidden');
        var rows = v.rows;
        var i = 0;
        function next() {
          if (i >= rows.length) return Promise.resolve();
          rows[i].forEach(function (c) { c.classList.add('is-in'); });
          i += 1;
          return ctx.sleep(s.every || 70).then(next);
        }
        return ctx.sleep(s.ms || 800).then(next).then(function () {
          setStep(0, 'done-active');
          v.run.classList.remove('is-busy');
        });
      },

      /* 2단계 — 항목별 AI 초안이 차례로 써진다 */
      generate: function (s, ctx) {
        v.empty.classList.add('is-hidden');
        if (v.steps.length) {
          setStep(0, 'done');
          setStep(1, 'run');
        }
        if (v.intakeBox) v.intakeBox.classList.add('is-hidden');
        v.body.scrollTop = 0;
        v.run.classList.add('is-busy');
        var i = 0;
        function next() {
          if (i >= v.items.length) return Promise.resolve();
          var it = v.items[i];
          var idx = i;
          i += 1;
          it.card.classList.remove('is-hidden');
          it.card.classList.add('is-writing');
          if (!ctx.instant) U.reveal(v.body, it.card);
          return stream(it.text, items[idx].text, s.every || 28, ctx, 2)
            .then(function () {
              it.card.classList.remove('is-writing');
              it.card.classList.add('is-written');
              paintText(idx);
              return ctx.sleep(s.gap || 300);
            })
            .then(next);
        }
        return next().then(function () {
          if (v.steps.length) setStep(1, 'done-active');
          v.run.classList.remove('is-busy');
          v.pvBtn.classList.remove('is-disabled');
          if (!ctx.instant) v.body.scrollTop = 0;
        });
      },

      /* AI 가이드 강조 — 참조 줄에 표시 */
      guide: function (s) {
        v.items.forEach(function (it, i) { it.guide.classList.toggle('is-focus', i === s.index); });
        var it = v.items[s.index];
        if (it) U.reveal(v.body, it.card);
        return Promise.resolve();
      },

      /* 수정 — 편집 상자로 바뀌고 문장을 덧붙인다 */
      edit: function (s, ctx) {
        var it = v.items[s.index];
        if (!it) return Promise.resolve();
        it.text.classList.add('is-editing');
        it.copy.classList.add('is-hidden');
        it.edit.classList.add('is-hidden');
        it.cancel.classList.remove('is-hidden');
        it.save.classList.remove('is-hidden');
        U.reveal(v.body, it.card);
        var add = s.append || '';
        var span = h('span', 'agd-kw-added');
        paintText(s.index);
        it.text.appendChild(span);
        return stream(span, add, s.every || 40, ctx, 1).then(function () {
          v.added[s.index] = add;
          v.texts[s.index] = items[s.index].text + add;
        });
      },

      save: function (s, ctx) {
        var it = v.items[s.index];
        if (!it) return Promise.resolve();
        it.text.classList.remove('is-editing');
        it.copy.classList.remove('is-hidden');
        it.edit.classList.remove('is-hidden');
        it.cancel.classList.add('is-hidden');
        it.save.classList.add('is-hidden');
        it.guide.classList.remove('is-focus');
        paintText(s.index);
        it.card.classList.add('is-saved');
        U.toast(screen, L.saved, { tone: 'success', ms: 1800 }, ctx);
        return Promise.resolve();
      },

      copy: function (s, ctx) {
        var it = v.items[s.index];
        if (!it) return Promise.resolve();
        U.reveal(v.body, it.card);
        it.copy.classList.add('is-done');
        U.toast(screen, L.copied, { tone: 'success', ms: 2000 }, ctx);
        return Promise.resolve();
      },

      preview: function () {
        fillPaper();
        v.modal.classList.remove('is-hidden');
        v.dbody.scrollTop = 0;
        return Promise.resolve();
      },

      /* 미리보기 안에서 항목 위치로 부드럽게 내린다 */
      scrollPreview: function (s, ctx) {
        var sec = v.paper.querySelector('[data-i="' + (s.index || 0) + '"]');
        if (!sec) return Promise.resolve();
        var goal = Math.max(0, sec.offsetTop - v.paper.offsetTop - 8);
        goal = Math.min(goal, v.dbody.scrollHeight - v.dbody.clientHeight);
        if (ctx.instant) {
          v.dbody.scrollTop = goal;
          return Promise.resolve();
        }
        var from = v.dbody.scrollTop;
        var n = 0;
        var total = 12;
        function tick() {
          n += 1;
          var t = n / total;
          v.dbody.scrollTop = from + (goal - from) * (1 - Math.pow(1 - t, 3));
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
      var parts = String(key).split(':');
      var el = null;
      var box = null;
      var it = v.items[+parts[1]];
      if (key === 'receipt') el = v.input;
      else if (key === 'run') el = v.run;
      else if (key === 'preview') el = v.pvBtn;
      else if (key === 'print') el = v.pvPrint;
      else if (it && parts[0] === 'guide') { el = it.ref; box = v.body; }
      else if (it && parts[0] === 'edit') { el = it.edit; box = v.body; }
      else if (it && parts[0] === 'save') { el = it.save; box = v.body; }
      else if (it && parts[0] === 'copy') { el = it.copy; box = v.body; }
      if (!el || el.offsetParent === null) return null;
      if (box) U.reveal(box, el);
      return el;
    }

    build();
    return { reset: reset, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('kcomwel-assist', { mount: mount });
})(window, document);
