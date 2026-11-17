/*
 * 화면 유형 'regulation-admin' — 규정자료관리(관리자) · 포트폴리오 설계 0002 §3-1
 * 포트폴리오 캡처의 규정자료관리 화면을 재구성했다.
 *   왼쪽 앱 메뉴(규정 검색 화면과 같은 모양) | 규정자료관리(머리 · 규정 목록/도구 모음 · 규정 목록 표)
 *   규정 올리기 창 · 규정 상세 창(앱 전체를 덮음 — 개요(처리 과정 · 집계) · 쪽 대조 · 계산 도구)
 *
 * 각본 동작(actions): openUpload · pickFile · submitUpload · openDoc · process · tab · page · verify · type · calc · publish
 * 커서 목표(target): 'upload' · 'drop' · 'submit' · 'row:new' · 'tab:<id>' · 'page:<n>' · 'input:<i>' · 'calc' · 'publish'
 * 글은 textContent로만 넣는다. 기다림은 ctx.sleep만 쓴다. 모든 동작은 ctx.instant에서 최종 상태를 바로 그린다.
 * 안쪽 상자만 스크롤하고 페이지 스크롤은 건드리지 않는다.
 */
(function (window, document) {
  'use strict';
  if (!window.AgentDemo || !window.AgentDemo.util) return;

  var U = window.AgentDemo.util;
  var h = U.h;
  var icon = U.icon;

  /* 화면 문구 — 캡처를 따른다(규정 올리기 창 · 처리 과정 · 처리 중/검토 대기는 재구성) */
  var L = {
    upload: '규정 올리기',
    listTabs: ['규정 목록', '도구 모음'],
    listTitle: '규정 목록',
    chips: { all: '전체', published: '게시됨', paused: '게시중지' },
    cols: ['순번', '규정명', '제개정일', '상태', '쪽수', '청크', '계산 도구'],
    status: { processing: '처리 중', review: '검토 대기', published: '게시됨' },
    dialog: {
      drop: 'HWP · HWPX · PDF 파일을 끌어다 놓거나 눌러서 고르세요',
      category: '구분',
      choose: '선택',
      cancel: '취소',
      submit: '올리기'
    },
    tabs: [
      { id: 'overview', label: '개요' },
      { id: 'compare', label: '쪽 대조', count: true },
      { id: 'structure', label: '구조' },
      { id: 'chunks', label: '청크 · 요약', count: true },
      { id: 'tools', label: '계산 도구', count: true }
    ],
    publish: '게시',
    unpublish: '게시중지',
    searchable: '규정질의응답에서 검색됩니다',
    process: '처리 과정',
    stats: '집계',
    match: function (p) { return '일치 ' + Number(p).toFixed(1) + '%'; },
    flag: '검증대상',
    transcribed: '옮겨 적은 내용',
    layer: '텍스트 레이어',
    onlyOrig: '원문에만 있는 한글(누락 의심)',
    onlyNew: '옮겨 적은 내용에만 있는 한글(추가 의심)',
    none: '없음',
    kind: '계산식',
    pass: '검사 통과',
    usedQa: '질의응답 사용',
    viewPage: '원문 쪽 보기',
    editDef: '정의 수정',
    usage: '쓰임새',
    usageEdit: '쓰임새 수정',
    input: '입력',
    basis: '근거 문구: ',
    test: '테스트',
    trial: '시험 실행',
    calc: '계산',
    toast: '게시했습니다. 규정질의응답에서 검색됩니다.'
  };

  /* 안쪽 상자에서만 — 세로는 util.reveal, 가로(좁은 화면의 가로 줄)는 여기서 */
  function revealX(box, el) {
    if (!box || !el || box.scrollWidth <= box.clientWidth) return;
    var b = box.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    if (r.left < b.left + 8) box.scrollLeft -= b.left + 8 - r.left + 16;
    else if (r.right > b.right - 8) box.scrollLeft += r.right - b.right + 16;
  }

  /* 안쪽 상자에서 el을 위쪽 1/3쯤에 둔다 — 아래 가운데 토스트에 가리지 않게 */
  function centerIn(box, el, ratio) {
    if (!box || !el) return;
    var b = box.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    box.scrollTop += r.top - (b.top + b.height * (ratio || 0.3));
  }

  /* 글 속 숫자를 근거 대조 표시용 조각으로 */
  function appendMarked(parent, text, nums, bag) {
    String(text).split(/(\d+)/).forEach(function (part) {
      if (!part) return;
      if (nums && nums.indexOf(part) !== -1) {
        var s = h('span', 'agd-ra-num', part);
        s.setAttribute('data-num', part);
        parent.appendChild(s);
        bag.push(s);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
    return parent;
  }

  function hangulOnly(text) {
    return String(text).replace(/[^가-힣]/g, '');
  }

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var doc = app.doc || {};
    var R;
    var S;

    function statusPill(kind) {
      var tone = kind === 'published' ? 'is-success' : kind === 'review' ? 'is-warning' : 'is-info';
      var p = h('span', 'agd-k-pill agd-ra-state ' + tone);
      if (kind === 'processing') p.appendChild(h('span', 'agd-k-spin'));
      p.appendChild(h('span', null, L.status[kind]));
      return p;
    }

    function setStatus(kind) {
      S.status = kind;
      R.mStatus.textContent = '';
      R.mStatus.appendChild(statusPill(kind));
      if (R.newRow) {
        R.newRow.status.textContent = '';
        R.newRow.status.appendChild(statusPill(kind));
      }
    }

    /* ---------------------------------------------------------------- 뼈대 */
    function buildNav() {
      var nav = h('div', 'agd-k-nav agd-ra-nav');
      var brand = h('div', 'agd-k-brand');
      brand.appendChild(icon('sparkle', 'agd-k-logo'));
      brand.appendChild(h('span', null, app.brand || ''));
      nav.appendChild(brand);
      var menu = h('ul', 'agd-k-menu');
      (app.menus || []).forEach(function (m) {
        var li = h('li', m.open ? 'is-open' : null);
        li.appendChild(icon(m.icon || 'file'));
        li.appendChild(h('span', null, m.label));
        menu.appendChild(li);
        (m.sub || []).forEach(function (t, i) {
          menu.appendChild(h('li', 'agd-ra-sub' + (i === m.subActive ? ' is-active' : ''), t));
        });
      });
      nav.appendChild(menu);
      return nav;
    }

    function cellsFor(row, r, n) {
      row.appendChild(h('span', 'agd-ra-c-no', n));
      var name = h('span', 'agd-ra-c-name');
      name.appendChild(h('span', 'agd-ra-rname', r.name));
      if (r.meta) name.appendChild(h('span', 'agd-ra-rmeta', r.meta));
      row.appendChild(name);
      row.appendChild(h('span', 'agd-ra-c-date', r.revised));
      var st = h('span', 'agd-ra-c-status');
      row.appendChild(st);
      var cells = [h('span', 'agd-ra-c-num', r.pages), h('span', 'agd-ra-c-num', r.chunks), h('span', 'agd-ra-c-num', r.tools)];
      cells.forEach(function (c) { row.appendChild(c); });
      return { status: st, nums: cells };
    }

    function chip(label, cls) {
      var c = h('span', 'agd-ra-chip' + (cls ? ' ' + cls : ''));
      c.appendChild(h('span', null, label));
      var b = h('b');
      c.appendChild(b);
      return b;
    }

    function renderCounts() {
      R.total.textContent = S.counts.all + '건';
      R.cAll.textContent = S.counts.all;
      R.cPub.textContent = S.counts.published;
      R.cPause.textContent = S.counts.paused;
    }

    function buildMain() {
      var page = app.page || {};
      var main = h('div', 'agd-ra-main');
      var head = h('div', 'agd-ra-head');
      var ht = h('div', 'agd-ra-headtext');
      ht.appendChild(h('p', 'agd-ra-title', page.title));
      ht.appendChild(h('p', 'agd-ra-desc', page.desc));
      head.appendChild(ht);
      R.upload = h('span', 'agd-k-btn is-primary agd-ra-upload');
      R.upload.appendChild(icon('plus'));
      R.upload.appendChild(h('span', null, L.upload));
      head.appendChild(R.upload);
      main.appendChild(head);

      var seg = h('div', 'agd-ra-seg');
      L.listTabs.forEach(function (t, i) { seg.appendChild(h('span', i === 0 ? 'is-active' : null, t)); });
      main.appendChild(seg);

      var card = h('div', 'agd-k-card agd-ra-list');
      var lhead = h('div', 'agd-ra-listhead');
      var lt = h('p', 'agd-ra-listtitle');
      lt.appendChild(h('span', null, L.listTitle));
      R.total = h('span', 'agd-ra-listcount');
      lt.appendChild(R.total);
      lhead.appendChild(lt);
      var chips = h('div', 'agd-ra-chips');
      R.cAll = chip(L.chips.all, 'is-active');
      R.cPub = chip(L.chips.published, 'is-ok');
      R.cPause = chip(L.chips.paused);
      [R.cAll, R.cPub, R.cPause].forEach(function (b) { chips.appendChild(b.parentNode); });
      lhead.appendChild(chips);
      card.appendChild(lhead);

      var head2 = h('div', 'agd-ra-tr is-head');
      L.cols.forEach(function (c, i) {
        var cls = ['agd-ra-c-no', 'agd-ra-c-name', 'agd-ra-c-date', 'agd-ra-c-status', 'agd-ra-c-num', 'agd-ra-c-num', 'agd-ra-c-num'][i];
        head2.appendChild(h('span', cls, c));
      });
      card.appendChild(head2);
      R.tbody = h('div', 'agd-ra-tbody');
      (app.rows || []).forEach(function (r, i) {
        var row = h('div', 'agd-ra-tr');
        cellsFor(row, r, i + 1).status.appendChild(statusPill('published'));
        R.tbody.appendChild(row);
      });
      card.appendChild(R.tbody);
      main.appendChild(card);
      return main;
    }

    function buildUpload() {
      var up = app.upload || {};
      var dim = h('div', 'agd-ra-dim agd-ra-updim');
      var dlg = h('div', 'agd-k-card agd-ra-dialog');
      var dh = h('div', 'agd-k-panelhead');
      dh.appendChild(h('span', null, L.upload));
      dlg.appendChild(dh);
      var body = h('div', 'agd-ra-dbody');
      R.drop = h('div', 'agd-ra-drop');
      R.drop.appendChild(icon('upload', 'agd-ra-dropico'));
      R.dropText = h('span', 'agd-ra-droptext', L.dialog.drop);
      R.drop.appendChild(R.dropText);
      R.fileChip = h('span', 'agd-ra-file');
      R.fileChip.appendChild(icon('file'));
      R.fileChip.appendChild(h('span', 'agd-ra-filename', up.file));
      R.drop.appendChild(R.fileChip);
      body.appendChild(R.drop);
      var field = h('div', 'agd-ra-dfield');
      field.appendChild(h('span', 'agd-ra-flabel', L.dialog.category));
      R.cat = h('span', 'agd-ra-select', L.dialog.choose);
      R.cat.appendChild(icon('chevron'));
      field.appendChild(R.cat);
      body.appendChild(field);
      dlg.appendChild(body);
      var foot = h('div', 'agd-ra-dfoot');
      foot.appendChild(h('span', 'agd-k-btn', L.dialog.cancel));
      R.submit = h('span', 'agd-k-btn is-primary is-disabled', L.dialog.submit);
      foot.appendChild(R.submit);
      dlg.appendChild(foot);
      dim.appendChild(dlg);
      R.upDim = dim;
      return dim;
    }

    function buildOverview() {
      var v = h('div', 'agd-ra-view agd-ra-ov');
      var steps = h('div', 'agd-k-card agd-ra-steps');
      var sh = h('div', 'agd-k-panelhead');
      sh.appendChild(h('span', null, L.process));
      R.stepCount = h('span', 'agd-ra-stepcount', '0 / ' + (doc.steps || []).length);
      sh.appendChild(R.stepCount);
      steps.appendChild(sh);
      var ol = h('ol', 'agd-ra-steplist');
      (doc.steps || []).forEach(function (s, i) {
        var li = h('li', 'agd-ra-step');
        var mark = h('span', 'agd-ra-stepmark', i + 1);
        li.appendChild(mark);
        var t = h('span', 'agd-ra-steptext');
        t.appendChild(h('span', 'agd-ra-stepname', s.name));
        t.appendChild(h('span', 'agd-ra-stepdesc', s.desc));
        li.appendChild(t);
        var res = h('span', 'agd-ra-stepres');
        li.appendChild(res);
        ol.appendChild(li);
        R.steps.push({ li: li, mark: mark, res: res, data: s });
      });
      steps.appendChild(ol);
      R.stepList = ol;
      v.appendChild(steps);

      var stats = h('div', 'agd-k-card agd-ra-stats');
      var th = h('div', 'agd-k-panelhead');
      th.appendChild(h('span', null, L.stats));
      stats.appendChild(th);
      var grid = h('div', 'agd-ra-statgrid');
      (doc.stats || []).forEach(function (s) {
        var box = h('div', 'agd-ra-stat');
        box.appendChild(h('span', 'agd-ra-statlabel', s.label));
        var val = h('span', 'agd-ra-statval', '—');
        box.appendChild(val);
        var sub = s.sub ? h('span', 'agd-ra-statsub', ' ') : null;
        if (sub) box.appendChild(sub);
        grid.appendChild(box);
        R.stats[s.key] = { value: val, sub: sub, data: s };
      });
      stats.appendChild(grid);
      v.appendChild(stats);
      return v;
    }

    function skeleton() {
      R.paper.textContent = '';
      R.paper.classList.add('is-skel');
      R.tbox.textContent = '';
      [72, 90, 84, 60, 88, 76, 92, 54].forEach(function (w, i) {
        var bar = h('i');
        bar.style.width = w + '%';
        R.paper.appendChild(bar);
        if (i < 6) {
          var b2 = h('i');
          b2.style.width = (w - 6) + '%';
          R.tbox.appendChild(b2);
        }
      });
      R.diff.textContent = '';
      R.vpage.textContent = '— / ' + (doc.matches || []).length;
    }

    function buildCompare() {
      var v = h('div', 'agd-ra-view agd-ra-cmp');
      R.plist = h('div', 'agd-ra-plist');
      (doc.matches || []).forEach(function (p, i) {
        var n = i + 1;
        var it = h('div', 'agd-ra-pitem');
        it.appendChild(h('span', 'agd-ra-pno', n));
        it.appendChild(h('span', 'agd-ra-pmatch', L.match(p)));
        if (p < doc.threshold) {
          it.classList.add('is-flag');
          it.appendChild(h('span', 'agd-k-tag is-warning', L.flag));
        }
        R.plist.appendChild(it);
        R.pageItems[n] = it;
      });
      v.appendChild(R.plist);

      var viewer = h('div', 'agd-k-card agd-ra-viewer');
      var bar = h('div', 'agd-ra-vbar');
      bar.appendChild(h('span', 'agd-ra-pdf', 'PDF'));
      bar.appendChild(h('span', 'agd-ra-vname', doc.file));
      R.vpage = h('span', 'agd-ra-vpage');
      bar.appendChild(R.vpage);
      viewer.appendChild(bar);
      var wrap = h('div', 'agd-ra-paperwrap');
      R.paper = h('div', 'agd-ra-paper');
      wrap.appendChild(R.paper);
      viewer.appendChild(wrap);
      v.appendChild(viewer);

      var text = h('div', 'agd-ra-text');
      var seg = h('div', 'agd-ra-tseg');
      seg.appendChild(h('span', 'is-active', L.transcribed));
      seg.appendChild(h('span', null, L.layer));
      text.appendChild(seg);
      R.tbox = h('div', 'agd-ra-tbox');
      text.appendChild(R.tbox);
      R.diff = h('div', 'agd-ra-diff');
      text.appendChild(R.diff);
      R.text = text;
      v.appendChild(text);
      skeleton();
      return v;
    }

    function toolCard(t, full) {
      var c = h('div', 'agd-k-card agd-ra-tool');
      var top = h('div', 'agd-ra-ttop');
      top.appendChild(h('span', 'agd-ra-tname', t.name));
      top.appendChild(h('span', 'agd-k-tag', L.kind));
      top.appendChild(h('span', 'agd-k-pill is-info', L.pass));
      top.appendChild(h('span', 'agd-ra-tsrc', t.source));
      var btns = h('span', 'agd-ra-tbtns');
      btns.appendChild(h('span', 'agd-k-btn is-xs', L.viewPage));
      btns.appendChild(h('span', 'agd-k-btn is-xs', L.editDef));
      btns.appendChild(h('span', 'agd-k-pill is-success', L.usedQa));
      top.appendChild(btns);
      c.appendChild(top);
      c.appendChild(h('p', 'agd-ra-tdesc', t.desc));
      if (!full) return c;

      var usage = h('div', 'agd-ra-usage');
      var uh = h('div', 'agd-ra-usagehead');
      uh.appendChild(h('span', null, L.usage));
      uh.appendChild(h('span', null, L.usageEdit));
      usage.appendChild(uh);
      (t.usage || []).forEach(function (u) {
        var r = h('div', 'agd-ra-urow');
        r.appendChild(h('span', 'agd-ra-ukey', u[0]));
        r.appendChild(h('span', 'agd-ra-uval', u[1]));
        usage.appendChild(r);
      });
      c.appendChild(usage);

      var inp = h('p', 'agd-ra-tinput');
      inp.appendChild(h('b', null, L.input + ' '));
      inp.appendChild(document.createTextNode(t.input || ''));
      c.appendChild(inp);
      var code = h('div', 'agd-ra-code');
      (t.code || []).forEach(function (line) { code.appendChild(appendMarked(h('div'), line, t.basisNums, R.nums)); });
      c.appendChild(code);
      c.appendChild(appendMarked(h('p', 'agd-ra-basis', L.basis), t.basis, t.basisNums, R.nums));

      var tests = h('div', 'agd-ra-tests');
      tests.appendChild(h('span', 'agd-ra-tlabel', L.test));
      (t.tests || []).forEach(function (x) {
        var e = h('span', 'agd-ra-test', x);
        tests.appendChild(e);
        R.tests.push(e);
      });
      c.appendChild(tests);

      var trial = h('div', 'agd-ra-trial');
      trial.appendChild(h('span', 'agd-ra-tlabel agd-ra-triallabel', L.trial));
      (t.fields || []).forEach(function (f) {
        var fd = h('span', 'agd-ra-field');
        fd.appendChild(h('span', 'agd-ra-flabel', f.label));
        var box = h('span', 'agd-ra-input is-empty');
        box.setAttribute('data-placeholder', f.unit);
        fd.appendChild(box);
        trial.appendChild(fd);
        R.inputs.push(box);
      });
      R.calc = h('span', 'agd-k-btn agd-ra-calc', L.calc);
      trial.appendChild(R.calc);
      R.result = h('span', 'agd-ra-result');
      trial.appendChild(R.result);
      R.resultText = t.result || '';
      c.appendChild(trial);
      return c;
    }

    function buildTools() {
      var v = h('div', 'agd-ra-view agd-ra-tools');
      var sum = h('div', 'agd-k-card agd-ra-tsum');
      var tags = h('div', 'agd-ra-ttags');
      (doc.toolTags || []).forEach(function (t) { tags.appendChild(h('span', 'agd-k-tag', t)); });
      sum.appendChild(tags);
      var flt = h('div', 'agd-ra-tfilter');
      (doc.toolFilters || []).forEach(function (f, i) { flt.appendChild(h('span', i === 0 ? 'is-active' : null, f.label + ' ' + f.n)); });
      sum.appendChild(flt);
      v.appendChild(sum);
      (doc.tools || []).forEach(function (t, i) { v.appendChild(toolCard(t, i === 0)); });
      return v;
    }

    function buildModal() {
      var dim = h('div', 'agd-ra-dim agd-ra-docdim');
      var m = h('div', 'agd-ra-modal');
      var head = h('div', 'agd-ra-mhead');
      var tw = h('div', 'agd-ra-mtitle');
      tw.appendChild(h('span', 'agd-ra-mname', doc.name));
      R.mStatus = h('span', 'agd-ra-mstatus');
      tw.appendChild(R.mStatus);
      R.mNote = h('span', 'agd-ra-mnote');
      tw.appendChild(R.mNote);
      head.appendChild(tw);
      var acts = h('div', 'agd-ra-macts');
      R.publish = h('span', 'agd-k-btn is-primary is-disabled agd-ra-publish', L.publish);
      acts.appendChild(R.publish);
      var close = h('span', 'agd-k-btn agd-ra-close');
      close.appendChild(icon('close'));
      acts.appendChild(close);
      head.appendChild(acts);
      m.appendChild(head);

      R.mtabs = h('div', 'agd-ra-mtabs');
      L.tabs.forEach(function (t) {
        var b = h('span', 'agd-ra-mtab');
        b.appendChild(h('span', null, t.label));
        if (t.count) R.tabCount[t.id] = b.appendChild(h('span', 'agd-ra-mtabn'));
        R.mtabs.appendChild(b);
        R.tabs[t.id] = b;
      });
      m.appendChild(R.mtabs);
      R.mbody = h('div', 'agd-ra-mbody');
      R.views.overview = buildOverview();
      R.views.compare = buildCompare();
      R.views.tools = buildTools();
      ['overview', 'compare', 'tools'].forEach(function (k) { R.mbody.appendChild(R.views[k]); });
      m.appendChild(R.mbody);
      dim.appendChild(m);
      R.docDim = dim;
      return dim;
    }

    function build() {
      screen.textContent = '';
      R = { steps: [], stats: {}, tabs: {}, tabCount: {}, views: {}, pageItems: {}, inputs: [], tests: [], nums: [], newRow: null };
      var c = app.counts || {};
      S = { counts: { all: c.all || 0, published: c.published || 0, paused: c.paused || 0 }, status: null };
      var root = h('div', 'agd-k agd-ra');
      root.appendChild(buildNav());
      root.appendChild(buildMain());
      root.appendChild(buildUpload());
      root.appendChild(buildModal());
      screen.appendChild(root);
      R.root = root;
      renderCounts();
      showTab('overview');
    }

    function showTab(id) {
      Object.keys(R.tabs).forEach(function (k) { R.tabs[k].classList.toggle('is-active', k === id); });
      Object.keys(R.views).forEach(function (k) { R.views[k].classList.toggle('is-active', k === id); });
      R.mbody.scrollTop = 0;
      revealX(R.mtabs, R.tabs[id]);
    }

    function setStep(st, state) {
      st.li.classList.toggle('is-run', state === 'run');
      st.li.classList.toggle('is-done', state === 'done');
      st.mark.textContent = '';
      if (state === 'run') st.mark.appendChild(h('span', 'agd-k-spin'));
      else if (state === 'done') st.mark.appendChild(icon('check'));
      else st.mark.textContent = String(R.steps.indexOf(st) + 1);
    }

    function completeStep(st) {
      setStep(st, 'done');
      st.res.textContent = st.data.result || '';
      (st.data.show || []).forEach(function (k) {
        var p = k.split('.');
        var s = R.stats[p[0]];
        if (!s) return;
        var el = p[1] === 'sub' ? s.sub : s.value;
        if (!el) return;
        el.textContent = p[1] === 'sub' ? s.data.sub : s.data.value;
        el.classList.add('is-fresh');
      });
      var tab = st.data.tab || {};
      Object.keys(tab).forEach(function (k) { if (R.tabCount[k]) R.tabCount[k].textContent = tab[k]; });
    }

    function showPage(n) {
      Object.keys(R.pageItems).forEach(function (k) { R.pageItems[k].classList.toggle('is-active', +k === n); });
      revealX(R.plist, R.pageItems[n]);
      U.reveal(R.plist, R.pageItems[n]);
      var pg = doc.page || {};
      if (pg.n !== n) return skeleton();
      R.vpage.textContent = n + ' / ' + (doc.matches || []).length;
      R.paper.classList.remove('is-skel');
      R.paper.textContent = '';
      R.paper.appendChild(h('p', 'agd-ra-plabel', pg.label));
      R.paper.appendChild(h('p', 'agd-ra-ptitle', pg.title));
      var box = h('ol', 'agd-ra-pbox');
      (pg.items || []).forEach(function (t, i) { box.appendChild(h('li', null, (i + 1) + '. ' + t)); });
      R.paper.appendChild(box);
      R.tbox.textContent = pg.transcript || '';
      R.diff.textContent = '';
      R.diff.appendChild(h('p', 'agd-ra-dhead', L.onlyOrig));
      R.diff.appendChild(h('p', 'agd-ra-dtext', L.none));
      R.diff.appendChild(h('p', 'agd-ra-dhead', L.onlyNew));
      R.diff.appendChild(h('p', 'agd-ra-dtext is-long', hangulOnly(pg.transcript) || L.none));
      R.text.scrollTop = 0;
    }

    /* ---------------------------------------------------------------- 각본 동작 */
    var actions = {
      openUpload: function () {
        R.upDim.classList.add('is-open');
      },
      pickFile: function () {
        R.drop.classList.add('has-file');
        R.cat.firstChild.nodeValue = (app.upload || {}).category || '';
        R.cat.classList.add('is-filled');
        R.submit.classList.remove('is-disabled');
      },
      submitUpload: function () {
        R.upDim.classList.remove('is-open');
        var row = h('div', 'agd-ra-tr is-new');
        var refs = cellsFor(row, { name: doc.name, meta: doc.meta, revised: doc.revised, pages: '—', chunks: '—', tools: '—' }, 1);
        R.newRow = { el: row, status: refs.status, nums: refs.nums };
        R.tbody.insertBefore(row, R.tbody.firstChild);
        var nos = R.tbody.querySelectorAll('.agd-ra-c-no');
        for (var i = 0; i < nos.length; i++) nos[i].textContent = String(i + 1);
        R.tbody.scrollTop = 0;
        S.counts.all += 1;
        renderCounts();
        setStatus('processing');
      },
      openDoc: function () {
        R.docDim.classList.add('is-open');
        showTab('overview');
        setStatus(S.status || 'processing');
      },
      process: function (s, ctx) {
        var every = s.every || 600;
        var i = 0;
        var n = R.steps.length;
        function next() {
          if (i >= n) {
            R.stepCount.textContent = n + ' / ' + n;
            var rv = doc.row || {};
            if (R.newRow) [rv.pages, rv.chunks, rv.tools].forEach(function (t, k) { R.newRow.nums[k].textContent = t || '—'; });
            setStatus('review');
            R.publish.classList.remove('is-disabled');
            return Promise.resolve();
          }
          var st = R.steps[i];
          setStep(st, 'run');
          R.stepCount.textContent = i + ' / ' + n;
          if (!ctx.instant) U.reveal(R.mbody, st.li);
          return ctx.sleep(every).then(function () {
            completeStep(st);
            i += 1;
            return next();
          });
        }
        return next();
      },
      tab: function (s) {
        showTab(s.id);
      },
      page: function (s) {
        showPage(s.n);
      },
      verify: function (s, ctx) {
        var every = s.every || 500;
        var seq = R.tests.map(function (t) { return [t]; });
        var nums = (doc.tools && doc.tools[0] && doc.tools[0].basisNums) || [];
        nums.forEach(function (num) {
          seq.push(R.nums.filter(function (e) { return e.getAttribute('data-num') === num; }));
        });
        var i = 0;
        function next() {
          if (i >= seq.length) return Promise.resolve();
          seq[i].forEach(function (e) { e.classList.add('is-on'); });
          if (!ctx.instant && seq[i][0]) U.reveal(R.mbody, seq[i][0]);
          i += 1;
          return ctx.sleep(every).then(next);
        }
        return next();
      },
      type: function (s, ctx) {
        var box = R.inputs[s.field || 0];
        if (!box) return null;
        var text = String(s.text || '');
        box.classList.add('is-focus');
        box.classList.remove('is-empty');
        if (ctx.instant) {
          box.textContent = text;
          box.classList.remove('is-focus');
          return null;
        }
        var i = 0;
        function next() {
          if (i >= text.length) {
            box.classList.remove('is-focus');
            return Promise.resolve();
          }
          i += 1;
          box.textContent = text.slice(0, i);
          return ctx.sleep(s.every || 140).then(next);
        }
        return next();
      },
      calc: function (s, ctx) {
        R.result.textContent = '';
        centerIn(R.mbody, R.calc.parentNode);
        if (ctx.instant) {
          R.result.textContent = R.resultText;
          return null;
        }
        R.result.appendChild(h('span', 'agd-k-spin'));
        return ctx.sleep(450).then(function () {
          R.result.textContent = R.resultText;
          R.result.classList.add('is-fresh');
        });
      },
      publish: function (s, ctx) {
        setStatus('published');
        R.mNote.textContent = L.searchable;
        R.publish.textContent = L.unpublish;
        R.publish.classList.remove('is-primary');
        if (S.counts.published < S.counts.all - S.counts.paused) S.counts.published += 1;
        renderCounts();
        U.toast(screen, L.toast, { tone: 'success', ms: 2600 }, ctx);
      }
    };

    /* 커서 목표 — 보이지 않으면 null(엔진이 그 커서 장면을 건너뛴다) */
    function target(key) {
      var p = String(key).split(':');
      var el = null;
      var box = null;
      if (key === 'upload') el = R.upload;
      else if (key === 'drop') el = R.drop;
      else if (key === 'submit') el = R.submit;
      else if (key === 'row:new') el = R.newRow ? R.newRow.el : null;
      else if (key === 'calc') el = R.calc;
      else if (key === 'publish') el = R.publish;
      else if (p[0] === 'tab') {
        el = R.tabs[p[1]];
        revealX(R.mtabs, el);
      } else if (p[0] === 'page') {
        el = R.pageItems[p[1]];
        box = R.plist;
        revealX(R.plist, el);
      } else if (p[0] === 'input') el = R.inputs[+p[1]];
      if (!el || el.offsetParent === null) return null;
      if (el === R.calc || R.inputs.indexOf(el) !== -1) centerIn(R.mbody, el.closest('.agd-ra-trial'));
      if (box) U.reveal(box, el);
      return el;
    }

    build();
    return { reset: build, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('regulation-admin', { mount: mount });
})(window, document);
