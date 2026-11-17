/*
 * 화면 유형 'kcomwel-guide' — AI 재해조사 어시스턴트 · AI업무가이드(포트폴리오 설계 0003 §3-1)
 * 원본 화면(시험 환경 캡처)의 구조 · 문구를 재구성했다. 업무 포털 바깥 틀(로고 · 상단 탭)은 그리지 않는다.
 *   위: 제품 머리줄 · 왼쪽 메뉴 · 화면 제목 · 접수번호 줄([정보 조회] · 오른쪽 보기 단추)
 *   본문: 왼쪽 접수 데이터(재해자 · 사업장 표, 직종 · 근무기간 · 유효기간 입력, [생성]) | 오른쪽 AI 가이드
 *         (추천 업무처리절차 · 상병코드 정보 · 관련 법령 및 규정 · 과거 유사사례 + 결과 비율)
 *   배치: lg는 좌우 2단(칸마다 안쪽 스크롤), md · sm은 한 단(본문 스크롤)
 * 화면 내용은 모두 각본 데이터(app)에서 온다. 머리줄 · 메뉴 · 접수번호 줄은 kcomwel-assist와 같은 마크업 · 클래스다.
 *
 * 각본 동작(actions): type · lookup · select · fill · generate · section · law · ratio
 * 커서 목표(target): 'receipt' · 'lookup' · 'job:<i>' · 'years' · 'months' · 'valid' · 'run' · 'law:<i>' · 'ratio'
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
    kwSearch: '<svg viewBox="0 0 24 24"' + S + '><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
  });

  /* 원본 화면 문구 */
  var L = {
    receiptHint: '접수번호',
    lookup: '정보 조회',
    run: 'AI업무가이드 생성',
    views: ['AI추천 업무처리절차', '자체조사'],
    intake: '접수 데이터',
    guide: 'AI 가이드',
    job: '직종 선택',
    period: '근무기간 입력',
    valid: '유효기간 입력',
    year: '년',
    month: '개월',
    choose: '선택',
    ratio: '업무처리 결과 비율',
    count: '건',
    emptyIntake: '접수번호를 넣고 정보 조회를 누르세요.',
    emptyGuide: '접수 데이터와 직종 · 근무기간을 넣고 [AI업무가이드 생성]을 누르면 추천 절차와 근거가 나옵니다.'
  };

  /* '**굵게**' 표시를 조각으로 — [{ t, b }] */
  function parts(text) {
    var out = [];
    String(text).split('**').forEach(function (t, i) {
      if (t) out.push({ t: t, b: i % 2 === 1 });
    });
    return out;
  }

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var v = {};

    function btn(cls, ico, text) {
      var b = h('span', 'agd-kw-btn' + (cls ? ' ' + cls : ''));
      if (ico) b.appendChild(icon(ico));
      if (text) b.appendChild(h('span', null, text));
      return b;
    }

    /* 라벨 · 값 표(4칸, 한 줄 전체는 [라벨, 값]) — kcomwel-assist의 접수 데이터 표와 같은 클래스 */
    function kvTable(rows) {
      var table = h('div', 'agd-kw-table');
      var cells = [];
      rows.forEach(function (r) {
        for (var c = 0; c < r.length; c += 2) {
          var lab = h('span', 'agd-kw-th', r[c]);
          var val = h('span', 'agd-kw-td' + (r.length === 2 ? ' is-wide' : ''), r[c + 1]);
          table.appendChild(lab);
          table.appendChild(val);
          cells.push(lab, val);
        }
      });
      return { el: table, cells: cells };
    }

    /* 머리줄이 있는 표 — 열 폭은 각본(widths · widthsSm)에서, links 열은 밑줄 글, hideSm 열은 좁은 창에서 숨김 */
    function grid(t) {
      var g = h('div', 'agd-kw-grid');
      g.style.setProperty('--kw-cols', t.widths || 'repeat(' + t.cols.length + ', minmax(0, 1fr))');
      if (t.widthsSm) g.style.setProperty('--kw-cols-sm', t.widthsSm);
      var hide = t.hideSm || [];
      var links = t.links || [];
      t.cols.forEach(function (c, i) {
        g.appendChild(h('span', 'agd-kw-gh' + (hide.indexOf(i) >= 0 ? ' is-smhide' : ''), c));
      });
      var rows = [];
      t.rows.forEach(function (r) {
        var cells = [];
        r.forEach(function (c, i) {
          var cell = h('span', 'agd-kw-gc' + (hide.indexOf(i) >= 0 ? ' is-smhide' : ''));
          var parts = String(c).split('\n');
          parts.forEach(function (p, k) {
            if (k) cell.appendChild(h('br'));
            cell.appendChild(links.indexOf(i) >= 0 ? h('span', 'agd-kw-link', p) : document.createTextNode(p));
          });
          g.appendChild(cell);
          cells.push(cell);
        });
        rows.push(cells);
      });
      return { el: g, rows: rows };
    }

    function build() {
      screen.textContent = '';
      v = {};
      var root = h('div', 'agd-k agd-kw is-guide');

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
      var lookup = btn('is-run', 'kwSearch', L.lookup);
      band.appendChild(lookup);
      var seg = h('span', 'agd-kw-seg');
      L.views.forEach(function (t, i) { seg.appendChild(h('span', i === 0 ? 'is-on' : null, t)); });
      band.appendChild(seg);
      main.appendChild(band);

      var body = h('div', 'agd-kw-gbody');

      // 왼쪽 — 접수 데이터
      var left = h('div', 'agd-kw-gcol');
      var secL = h('p', 'agd-kw-sec', L.intake);
      var ok = h('span', 'agd-kw-okmark');
      ok.appendChild(icon('check'));
      secL.appendChild(ok);
      left.appendChild(secL);
      var emptyL = h('p', 'agd-kw-empty is-small', L.emptyIntake);
      left.appendChild(emptyL);
      var intakeBox = h('div', 'agd-kw-gbox is-hidden');
      var victim = app.victim || { rows: [] };
      var workplace = app.workplace || { rows: [] };
      intakeBox.appendChild(h('p', 'agd-kw-gsub', victim.title || ''));
      var t1 = kvTable(victim.rows);
      intakeBox.appendChild(t1.el);
      intakeBox.appendChild(h('p', 'agd-kw-gsub', workplace.title || ''));
      var t2 = kvTable(workplace.rows);
      intakeBox.appendChild(t2.el);
      left.appendChild(intakeBox);

      // 직종 · 근무기간 · 유효기간
      var form = h('div', 'agd-kw-gbox agd-kw-form is-hidden');
      var f1 = h('div', 'agd-kw-field');
      var lab1 = h('p', 'agd-kw-flabel', L.job);
      lab1.appendChild(h('span', 'agd-kw-req', '*'));
      f1.appendChild(lab1);
      var sels = h('div', 'agd-kw-selects');
      var selects = [0, 1].map(function () {
        var s = h('span', 'agd-kw-select');
        var t = h('span', 'is-hint', L.choose);
        s.appendChild(t);
        s.appendChild(icon('chevron', 'agd-kw-selico'));
        sels.appendChild(s);
        return { el: s, text: t };
      });
      f1.appendChild(sels);
      form.appendChild(f1);
      var row = h('div', 'agd-kw-frow');
      function numBox(unit) {
        var wrap = h('span', 'agd-kw-numwrap');
        var box = h('span', 'agd-kw-num-in');
        var t = h('span', null, '');
        box.appendChild(t);
        wrap.appendChild(box);
        wrap.appendChild(h('span', 'agd-kw-unit', unit));
        return { wrap: wrap, el: box, text: t };
      }
      var f2 = h('div', 'agd-kw-field');
      f2.appendChild(h('p', 'agd-kw-flabel', L.period));
      var nums = h('div', 'agd-kw-nums');
      var years = numBox(L.year);
      var months = numBox(L.month);
      nums.appendChild(years.wrap);
      nums.appendChild(months.wrap);
      f2.appendChild(nums);
      row.appendChild(f2);
      var f3 = h('div', 'agd-kw-field');
      f3.appendChild(h('p', 'agd-kw-flabel', L.valid));
      var nums3 = h('div', 'agd-kw-nums');
      var valid = numBox(L.month);
      nums3.appendChild(valid.wrap);
      f3.appendChild(nums3);
      row.appendChild(f3);
      form.appendChild(row);
      left.appendChild(form);
      var runRow = h('div', 'agd-kw-runrow is-hidden');
      var run = btn('is-run is-disabled', 'sparkle', L.run);
      runRow.appendChild(run);
      left.appendChild(runRow);
      body.appendChild(left);

      // 오른쪽 — AI 가이드
      var right = h('div', 'agd-kw-gcol');
      var secR = h('p', 'agd-kw-sec', L.guide);
      secR.appendChild(h('span', 'agd-kw-ai', 'AI'));
      right.appendChild(secR);
      var gbox = h('div', 'agd-kw-gbox agd-kw-gguide');
      var emptyR = h('p', 'agd-kw-empty is-small', L.emptyGuide);
      gbox.appendChild(emptyR);

      var proc = h('div', 'agd-kw-gsec is-hidden');
      proc.appendChild(h('p', 'agd-kw-gsub', app.procedureTitle || ''));
      var ol = h('ol', 'agd-kw-proc');
      proc.appendChild(ol);
      gbox.appendChild(proc);

      function tableSec(t) {
        var sec = h('div', 'agd-kw-gsec is-hidden');
        var head = h('div', 'agd-kw-ghead');
        head.appendChild(h('p', 'agd-kw-gsub', t.title || ''));
        sec.appendChild(head);
        var g = grid(t);
        sec.appendChild(g.el);
        gbox.appendChild(sec);
        return { sec: sec, head: head, rows: g.rows };
      }
      var codes = tableSec(app.codes || { cols: [], rows: [] });
      var laws = tableSec(app.laws || { cols: [], rows: [] });
      var cases = tableSec(app.cases || { cols: [], rows: [] });
      var ratioBtn = btn('is-ratio', 'info', L.ratio);
      cases.head.appendChild(ratioBtn);
      var ratio = h('div', 'agd-kw-ratio is-hidden');
      cases.sec.appendChild(ratio);
      right.appendChild(gbox);
      body.appendChild(right);

      main.appendChild(body);
      frame.appendChild(main);
      root.appendChild(frame);
      screen.appendChild(root);

      v = {
        root: root, input: input, inputText: inputText, lookup: lookup, body: body,
        left: left, right: right, ok: ok, emptyL: emptyL, intakeBox: intakeBox,
        intakeCells: t1.cells.concat(t2.cells), form: form, selects: selects,
        nums: { years: years, months: months, valid: valid }, runRow: runRow, run: run,
        emptyR: emptyR, proc: proc, ol: ol, sections: { codes: codes, laws: laws, cases: cases },
        ratioBtn: ratioBtn, ratio: ratio
      };
    }

    /* 그 요소를 품은 스크롤 상자 — lg는 칸(.agd-kw-gcol)이 스크롤하고, md · sm은 본문이 스크롤한다 */
    function scroller(el) {
      var col = el && el.closest ? el.closest('.agd-kw-gcol') : null;
      if (col && window.getComputedStyle(col).overflowY !== 'visible') return col;
      return v.body;
    }

    function show(el) {
      if (el) U.reveal(scroller(el), el);
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

    /* 칸을 차례로 보이게 — 행 단위(rows: [[칸]]) */
    function rowsIn(rows, every, ctx) {
      var i = 0;
      function next() {
        if (i >= rows.length) return Promise.resolve();
        rows[i].forEach(function (c) { c.classList.add('is-in'); });
        i += 1;
        return ctx.sleep(every).then(next);
      }
      return next();
    }

    function canRun() {
      var filled = v.selects.every(function (s) { return !s.text.classList.contains('is-hint'); }) &&
        v.nums.years.text.textContent && v.nums.valid.text.textContent;
      v.run.classList.toggle('is-disabled', !filled);
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

      /* 정보 조회 — 재해자 · 사업장 표가 한 줄씩, 끝나면 접수 데이터 체크 */
      lookup: function (s, ctx) {
        v.lookup.classList.add('is-busy');
        v.left.scrollTop = 0;
        return ctx.sleep(s.ms || 700).then(function () {
          v.emptyL.classList.add('is-hidden');
          v.intakeBox.classList.remove('is-hidden');
          var cells = v.intakeCells;
          var pairs = [];
          for (var i = 0; i < cells.length; i += 2) pairs.push([cells[i], cells[i + 1]]);
          return rowsIn(pairs, s.every || 70, ctx);
        }).then(function () {
          v.lookup.classList.remove('is-busy');
          v.ok.classList.add('is-on');
          v.form.classList.remove('is-hidden');
          v.runRow.classList.remove('is-hidden');
        });
      },

      /* 직종 고르기 — 상자에 초점, 값이 바뀐다 */
      select: function (s, ctx) {
        var sel = v.selects[s.index || 0];
        if (!sel) return Promise.resolve();
        show(sel.el);
        sel.el.classList.add('is-focus');
        return ctx.sleep(s.ms || 350).then(function () {
          sel.text.textContent = s.value || '';
          sel.text.classList.remove('is-hint');
          sel.el.classList.remove('is-focus');
          canRun();
        });
      },

      /* 숫자 칸 입력 — field: years · months · valid */
      fill: function (s, ctx) {
        var box = v.nums[s.field];
        if (!box) return Promise.resolve();
        show(box.el);
        box.el.classList.add('is-focus');
        return stream(box.text, String(s.text || ''), s.every || 120, ctx, 1).then(function () {
          box.el.classList.remove('is-focus');
          canRun();
        });
      },

      /* AI업무가이드 생성 — 추천 업무처리절차가 한 줄씩 써진다 */
      generate: function (s, ctx) {
        v.run.classList.add('is-busy');
        v.emptyR.classList.add('is-hidden');
        v.proc.classList.remove('is-hidden');
        v.ol.textContent = '';
        v.right.scrollTop = 0;
        if (scroller(v.proc) === v.body && !ctx.instant) {
          // 한 단 배치 — AI 가이드 제목이 위에 오게 내린다
          v.body.scrollTop += v.right.getBoundingClientRect().top - v.body.getBoundingClientRect().top - 4;
        }
        var lines = app.procedure || [];
        var i = 0;
        function next() {
          if (i >= lines.length) return Promise.resolve();
          var li = h('li', 'is-writing');
          v.ol.appendChild(li);
          var segs = parts(lines[i]);
          i += 1;
          var k = 0;
          function seg() {
            if (k >= segs.length) {
              li.classList.remove('is-writing');
              return ctx.sleep(s.gap || 250).then(next);
            }
            var p = segs[k];
            k += 1;
            var el = h(p.b ? 'strong' : 'span');
            li.appendChild(el);
            return stream(el, p.t, s.every || 30, ctx, 2).then(seg);
          }
          return ctx.sleep(ctx.instant ? 0 : 120).then(seg);
        }
        return ctx.sleep(s.ms || 600).then(next).then(function () {
          v.run.classList.remove('is-busy');
          show(v.proc);
        });
      },

      /* 표 구역 보이기 — name: codes · laws · cases */
      section: function (s, ctx) {
        var t = v.sections[s.name];
        if (!t) return Promise.resolve();
        t.sec.classList.remove('is-hidden');
        if (!ctx.instant) {
          var box = scroller(t.sec);
          box.scrollTop += Math.max(0, t.sec.getBoundingClientRect().top - box.getBoundingClientRect().top - 8);
        }
        return rowsIn(t.rows, s.every || 160, ctx);
      },

      /* 관련 법령 행 강조 */
      law: function (s) {
        var rows = v.sections.laws.rows;
        rows.forEach(function (r, i) {
          r.forEach(function (c) { c.classList.toggle('is-focus', i === s.index); });
        });
        if (rows[s.index]) show(rows[s.index][0]);
        return Promise.resolve();
      },

      /* 업무처리 결과 비율 — 화면에 보이는 유사사례 행에서 센다 */
      ratio: function () {
        var col = (app.cases && app.cases.resultCol) || 0;
        var order = [];
        var count = {};
        ((app.cases && app.cases.rows) || []).forEach(function (r) {
          var k = r[col];
          if (!count[k]) { count[k] = 0; order.push(k); }
          count[k] += 1;
        });
        var total = order.reduce(function (a, k) { return a + count[k]; }, 0) || 1;
        v.ratio.textContent = '';
        var bar = h('div', 'agd-kw-rbar');
        var legend = h('div', 'agd-kw-rlegend');
        order.forEach(function (k, i) {
          var pct = Math.round((count[k] / total) * 100);
          var seg = h('span', 'agd-kw-rseg is-c' + i);
          seg.style.width = pct + '%';
          bar.appendChild(seg);
          var item = h('span', 'agd-kw-ritem');
          item.appendChild(h('i', 'agd-kw-rdot is-c' + i));
          item.appendChild(h('span', null, k + ' ' + count[k] + L.count + ' · ' + pct + '%'));
          legend.appendChild(item);
        });
        v.ratio.appendChild(bar);
        v.ratio.appendChild(legend);
        v.ratio.classList.remove('is-hidden');
        v.ratioBtn.classList.add('is-done');
        show(v.ratio);
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
      else if (key === 'lookup') el = v.lookup;
      else if (key === 'run') el = v.run;
      else if (key === 'ratio') el = v.ratioBtn;
      else if (p[0] === 'job' && v.selects[+p[1]]) el = v.selects[+p[1]].el;
      else if (v.nums[key]) el = v.nums[key].el;
      else if (p[0] === 'law') {
        var r = v.sections.laws.rows[+p[1]];
        el = r ? r[2].querySelector('.agd-kw-link') || r[2] : null;
      }
      if (!el || el.offsetParent === null) return null;
      show(el);
      return el;
    }

    build();
    return { reset: reset, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('kcomwel-guide', { mount: mount });
})(window, document);
