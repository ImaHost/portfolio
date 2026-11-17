/*
 * 화면 유형 'form-draft' — 공시 양식 AI 초안 작성 (설계 0002 §3-3 · §4-2)
 * 원본 공시초안작성 화면의 구조 · 문구를 재구성했다.
 *   위: 제목 · 단계 표시 4칸 · 공시 줄 · 공시 자료 카드(초안이 만들어지면 한 줄로 접힘)
 *   아래: 양식 카드(머리 · 목차 · 범례 · 표) | 오른쪽 패널(확인 필요 · 값 근거)
 *
 * 각본 동작(actions): upload · generate · stage · reveal · select · detail · goFlag · alt
 * 커서 목표(target): 'pick-file' · 'generate' · 'cell:<key>' · 'detail' · 'go-flag' · 'flag:<id>:alt' ·
 *                   'tab:<check|evidence>' · 'download'
 * 원본처럼 값은 한꺼번에 채운다(칸별 타자 없음) · 진행은 5단계 이름만 보인다.
 * 기다림은 모두 ctx.sleep(일시정지 · 취소를 따른다). 모든 동작은 ctx.instant에서 최종 상태를 바로 그린다.
 * 텍스트는 textContent로만 넣는다. 내부 스크롤만 움직이고 페이지 스크롤은 건드리지 않는다.
 */
(function (window, document) {
  'use strict';
  if (!window.AgentDemo || !window.AgentDemo.util) return;

  var U = window.AgentDemo.util;
  var h = U.h;
  var icon = U.icon;

  /* 원본 화면 문구 */
  var L = {
    flow: {
      pick: '공시 선택',
      source: '자료 올리기',
      sourceSub: '자료를 올리고 초안을 생성하세요',
      sourceCount: function (n) { return '자료 ' + n + '건'; },
      review: '값 확인',
      reviewSub: '초안을 생성하면 열립니다',
      reviewOpen: function (n) { return '확인 필요 ' + n + '건'; },
      reviewDone: '모두 확인함',
      download: '내려받기',
      downloadSub: '알리오 편집기에서 마무리'
    },
    pickerLabel: '공시선택',
    periodLabel: '공시 시점',
    pickerConfirm: '확인',
    reset: '초기화',
    status: { done: '초안 생성됨', running: '초안 생성 중' },
    sourceTitle: '공시 자료',
    sourceHint: '올린 자료와 추출한 값은 3일 뒤 삭제됩니다.',
    draftInfo: function (date, n) { return date + ' 생성 · 자료 ' + n + '건'; },
    sourceShow: '자료 보기',
    needsTitle: '이 자료를 올려 주세요',
    needRequired: '필요',
    needOptional: '있으면',
    dropTitle: '파일을 끌어다 놓거나 선택하세요',
    dropPick: '파일 선택',
    dropHint: '엑셀 · PDF · 묶음(ZIP) · 지난 공시(.asd) · 여러 개를 함께 올릴 수 있습니다. 많으면 ZIP이 빠릅니다',
    sourceCount: function (n) { return '올린 자료 ' + n + '건'; },
    fileState: { uploading: '업로드 중', ready: '올림 완료' },
    removeFile: '빼기',
    generate: '초안 생성',
    regenerate: '초안 다시 생성',
    generating: '생성 중',
    needFiles: '자료를 올려 주세요',
    readingFiles: function (done, all) { return '자료를 올리는 중입니다 (' + done + '/' + all + ')'; },
    steps: [
      ['READ', '자료 읽기'],
      ['FILL', '값 채우기'],
      ['ANALYZE', '빈 칸 분석'],
      ['CHECK', '양식 검사'],
      ['SAVE', '초안 저장']
    ],
    runningHint: '보통 1~2분 걸립니다. 다른 화면으로 가도 계속 만들어지고, 같은 공시를 다시 열면 이어서 볼 수 있습니다.',
    formTitle: function (name) { return name + ' 양식'; },
    formVersion: function (v) { return v + '판'; },
    compare: '비교하기',
    download: '내려받기',
    blankFormNote: '아직 빈 양식입니다. 자료를 올려 초안을 생성하면 값이 채워집니다. 직접 입력한 값은 그때 유지할지 고를 수 있습니다.',
    legend: [
      ['warn', '확인 필요'],
      ['info', '참고'],
      ['edited', '직접 수정'],
      ['auto', '자동 합계']
    ],
    legendHint: '칸을 눌러 값을 고치거나 근거를 볼 수 있습니다',
    tabCheck: '확인 필요',
    tabEvidence: '값 근거',
    checkEmpty: '초안을 생성하면 단위 · 수치 · 표 사이 일치를 확인해 여기에 표시합니다. 빈 양식은 그대로 직접 입력할 수 있습니다.',
    running: '초안을 만들고 있습니다.',
    checksTitle: '양식 검사',
    checksPass: function (ok, all) { return ok + '/' + all + ' 통과'; },
    checksAllPass: '알리오 양식의 검사 규칙(합계 · 표 사이 일치)을 모두 통과했습니다.',
    refPrefix: '근거 · ',
    keepValue: '현재 값 유지',
    confirm: '확인함',
    undo: '되돌리기',
    seeInForm: '양식에서 보기',
    seeInFormAt: function (at, all) { return '양식에서 보기 ' + at + '/' + all; },
    allDone: '확인 필요 항목을 모두 처리했습니다. 내려받을 수 있습니다.',
    noWarn: '확인이 필요한 항목이 없습니다. 내려받을 수 있습니다.',
    infoGroup: function (n) { return '참고 ' + n + '건'; },
    flagStatus: { warn: '확인 필요', info: '참고', keep: '확인함', alt: '값 바꿈' },
    altDone: function (label) { return label + ': 관련 칸을 바꿨습니다'; },
    evidenceEmpty: '양식에서 칸을 누르면 그 값을 어떤 자료에서 어떻게 채웠는지 보여 줍니다.',
    emptyValue: '비어 있음',
    source: '출처',
    usedFile: '참고한 자료',
    how: '채운 방법',
    unit: '단위',
    manual: '매뉴얼 근거',
    confidence: { exact: '자료 값', computed: '자료에서 계산', carried: '지난 공시 값', estimated: '추정 값 · 확인 필요' },
    sourceAuto: '자동 합계',
    autoBody: '재료 칸을 더해 자동으로 계산합니다. 직접 입력하지 않습니다.',
    formValue: '양식 값입니다.',
    detailMore: '근거 자세히',
    detailLess: '근거 접기',
    arrow: '▾',
    detailCalc: '계산 내역',
    detailQuotesOf: function (doc) { return '매뉴얼 원문 · ' + doc; },
    detailInterp: '적용한 해석',
    detailGoFlag: '확인 필요 카드 보기 ›',
    doneToast: function (warn, ok, all) {
      return all > 0
        ? '초안 생성 완료: 확인 필요 ' + warn + '건 · 양식 검사 ' + ok + '/' + all
        : '초안 생성 완료: 확인 필요 ' + warn + '건';
    }
  };

  var PATH_SEP = ' › ';
  var PREV = '@prev';
  var RIPPLE_MS = 60; // 값 등장 물결 — 표 순서 · 줄당(7줄이면 0.4초)

  function num(v) {
    var t = String(v === undefined || v === null ? '' : v).replace(/,/g, '').trim();
    if (t === '' || t === '-') return 0;
    var f = parseFloat(t);
    return isNaN(f) ? 0 : f;
  }

  function fmt(n) {
    return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(2);
  }

  function copy(map) {
    var out = {};
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) out[k] = map[k];
    return out;
  }

  function btn(text, cls, ico) {
    var b = h('span', 'agd-k-btn' + (cls ? ' ' + cls : ''));
    if (ico) b.appendChild(icon(ico));
    b.appendChild(h('span', 'agd-fd-btntext', text));
    return b;
  }

  function tag(text, tone) {
    return h('span', 'agd-k-tag' + (tone ? ' is-' + tone : ''), text);
  }

  function notice(text, tone) {
    return h('div', 'agd-k-notice' + (tone ? ' is-' + tone : ''), text);
  }

  /* 다시 그리지 않고 같은 애니메이션을 한 번 더 */
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var disc = app.disclosure || {};
    var form = app.form || { rows: [], head: {} };
    var rows = form.rows || [];
    var flags = app.flags || [];
    var evidence = app.evidence || {};
    var checks = app.checks || { ok: 0, all: 0 };
    var sourceFiles = app.files || [];
    screen.textContent = '';

    /* ---- 뼈대 */
    var root = h('div', 'agd-k agd-fd');

    var nav = h('div', 'agd-k-nav agd-fd-nav');
    var brand = h('div', 'agd-k-brand');
    brand.appendChild(icon('sparkle', 'agd-k-logo'));
    brand.appendChild(h('span', null, app.brand || ''));
    nav.appendChild(brand);
    var menu = h('ul', 'agd-k-menu');
    (app.menus || []).forEach(function (m) {
      var li = h('li', m.active ? 'is-active' : null);
      li.appendChild(icon(m.icon || 'file'));
      li.appendChild(h('span', null, m.label));
      menu.appendChild(li);
    });
    nav.appendChild(menu);
    root.appendChild(nav);

    var main = h('div', 'agd-fd-main');

    var head = h('div', 'agd-fd-head');
    head.appendChild(h('p', 'agd-fd-title', app.screenTitle || ''));
    head.appendChild(h('p', 'agd-fd-desc', app.screenDesc || ''));
    main.appendChild(head);

    // 단계 표시
    var flow = h('div', 'agd-fd-flow');
    var steps = [L.flow.pick, L.flow.source, L.flow.review, L.flow.download].map(function (label, i) {
      var s = h('div', 'agd-fd-step');
      var n = h('span', 'agd-fd-num');
      var text = h('span', 'agd-fd-steptext');
      text.appendChild(h('span', 'agd-fd-steplabel', label));
      var sub = h('span', 'agd-fd-stepsub');
      text.appendChild(sub);
      s.appendChild(n);
      s.appendChild(text);
      flow.appendChild(s);
      return { el: s, num: n, sub: sub, index: i, state: null };
    });
    main.appendChild(flow);

    // 공시 줄
    var bar = h('div', 'agd-k-card agd-fd-bar');
    function field(text, cls) {
      var f = h('span', 'agd-fd-field' + (cls ? ' ' + cls : ''));
      f.appendChild(h('span', 'agd-fd-fieldtext', text));
      f.appendChild(icon('chevron'));
      return f;
    }
    bar.appendChild(h('span', 'agd-fd-barlabel', L.pickerLabel));
    bar.appendChild(field(disc.name || '', 'agd-fd-pick'));
    bar.appendChild(h('span', 'agd-fd-barlabel', L.periodLabel));
    bar.appendChild(field(disc.periodOption || '', 'agd-fd-period'));
    // 고른 공시 · 시점이 이미 열려 있어 [확인]은 꺼져 있다(원본과 같음)
    bar.appendChild(btn(L.pickerConfirm, 'is-primary is-disabled agd-fd-confirm'));
    var pill = h('span', 'agd-k-pill');
    bar.appendChild(pill);
    var resetBtn = btn(L.reset, 'is-ghost agd-fd-reset', 'refresh');
    bar.appendChild(resetBtn);
    main.appendChild(bar);

    // 공시 자료
    var source = h('div', 'agd-k-card agd-fd-source');
    var srcHead = h('div', 'agd-fd-srchead');
    srcHead.appendChild(h('span', 'agd-fd-srctitle', L.sourceTitle));
    var srcHint = h('span', 'agd-fd-srchint');
    srcHead.appendChild(srcHint);
    var srcToggle = btn(L.sourceShow, 'is-xs agd-fd-srctoggle');
    srcHead.appendChild(srcToggle);
    source.appendChild(srcHead);

    var srcBody = h('div', 'agd-fd-srcbody');
    var needs = h('div', 'agd-fd-needs');
    needs.appendChild(h('b', 'agd-fd-needstitle', L.needsTitle));
    var needList = h('ul', 'agd-fd-needlist');
    (app.needs || []).forEach(function (n) {
      var li = h('li');
      li.appendChild(tag(n.required ? L.needRequired : L.needOptional));
      li.appendChild(h('b', null, n.name));
      li.appendChild(h('span', 'agd-fd-neednote', n.note));
      needList.appendChild(li);
    });
    needs.appendChild(needList);
    srcBody.appendChild(needs);

    var drop = h('div', 'agd-fd-drop');
    var dropRow = h('div', 'agd-fd-droprow');
    dropRow.appendChild(icon('upload'));
    dropRow.appendChild(h('span', 'agd-fd-droptitle', L.dropTitle));
    var pickBtn = btn(L.dropPick, 'is-xs');
    dropRow.appendChild(pickBtn);
    drop.appendChild(dropRow);
    drop.appendChild(h('span', 'agd-fd-drophint', L.dropHint));
    srcBody.appendChild(drop);

    var filesBox = h('div', 'agd-fd-files');
    var filesHead = h('div', 'agd-fd-fileshead');
    var fileList = h('div', 'agd-fd-filelist');
    filesBox.appendChild(filesHead);
    filesBox.appendChild(fileList);
    srcBody.appendChild(filesBox);

    var progress = h('div', 'agd-k-notice is-info agd-fd-progress');
    var progIn = h('div', 'agd-fd-progin');
    var stageRow = h('div', 'agd-fd-stages');
    var stageEls = L.steps.map(function (s) {
      var sp = h('span', 'agd-fd-stage');
      var mark = h('span', 'agd-fd-stagemark');
      sp.appendChild(mark);
      sp.appendChild(h('span', null, s[1]));
      stageRow.appendChild(sp);
      return { el: sp, mark: mark, state: null };
    });
    progIn.appendChild(stageRow);
    progIn.appendChild(h('div', 'agd-fd-runhint', L.runningHint));
    progress.appendChild(progIn);
    srcBody.appendChild(progress);

    var srcFoot = h('div', 'agd-fd-srcfoot');
    var genWhy = h('span', 'agd-fd-genwhy');
    var genBtn = h('span', 'agd-k-btn is-primary agd-fd-gen');
    var genSpin = h('span', 'agd-k-spin');
    var genText = h('span', 'agd-fd-btntext');
    genBtn.appendChild(genSpin);
    genBtn.appendChild(genText);
    srcFoot.appendChild(genWhy);
    srcFoot.appendChild(genBtn);
    srcBody.appendChild(srcFoot);
    source.appendChild(srcBody);
    main.appendChild(source);

    // 작업 영역 — 양식 카드 | 오른쪽 패널
    var work = h('div', 'agd-fd-work');

    var formCard = h('div', 'agd-k-card agd-fd-form');
    var formHead = h('div', 'agd-fd-formhead');
    var formTitle = h('div', 'agd-fd-formtitle');
    formTitle.appendChild(h('span', 'agd-fd-formname', L.formTitle(disc.name || '')));
    formTitle.appendChild(tag(disc.period || ''));
    var versionTag = tag(L.formVersion(disc.version || ''));
    versionTag.classList.add('agd-fd-vertag');
    formTitle.appendChild(versionTag);
    formHead.appendChild(formTitle);
    var formActs = h('div', 'agd-fd-formacts');
    var cmpBtn = btn(L.compare, 'is-xs agd-fd-cmp');
    var dlBtn = btn(L.download, 'is-xs is-primary');
    formActs.appendChild(cmpBtn);
    formActs.appendChild(dlBtn);
    formHead.appendChild(formActs);
    var toc = h('div', 'agd-fd-toc');
    (app.toc || []).forEach(function (t, i) {
      toc.appendChild(h('span', 'agd-fd-tocitem' + (i === 0 ? ' is-on' : ''), t));
    });
    formHead.appendChild(toc);
    formCard.appendChild(formHead);

    var legend = h('div', 'agd-fd-legend');
    L.legend.forEach(function (x) {
      var s = h('span', 'agd-fd-legenditem');
      s.appendChild(h('i', 'agd-fd-sw is-' + x[0]));
      s.appendChild(document.createTextNode(x[1]));
      legend.appendChild(s);
    });
    legend.appendChild(h('span', 'agd-fd-legendhint', L.legendHint));
    formCard.appendChild(legend);

    var formNote = h('div', 'agd-fd-note', L.blankFormNote);
    formCard.appendChild(formNote);

    var sheet = h('div', 'agd-fd-sheet');
    var paper = h('div', 'agd-fd-paper');
    var secRow = h('div', 'agd-fd-secrow');
    secRow.appendChild(h('span', 'agd-fd-section', form.section || ''));
    secRow.appendChild(h('span', 'agd-fd-unit', form.unit || ''));
    paper.appendChild(secRow);

    // 표 — 값 칸은 key(2026년 2/4분기)와 key@prev(2025년)
    var cells = {};
    var cellOrder = [];
    var groupOf = {};
    var table = h('table', 'agd-fd-table');
    var colgroup = h('colgroup');
    [21, 29, 25, 25].forEach(function (w) {
      var c = h('col');
      c.style.width = w + '%';
      colgroup.appendChild(c);
    });
    table.appendChild(colgroup);
    var tbody = h('tbody');
    var headRow = h('tr');
    var th = h('td', 'agd-fd-th', (form.head && form.head.label) || '');
    th.colSpan = 2;
    headRow.appendChild(th);
    headRow.appendChild(h('td', 'agd-fd-th', (form.head && form.head.prev) || ''));
    headRow.appendChild(h('td', 'agd-fd-th', (form.head && form.head.cur) || ''));
    tbody.appendChild(headRow);
    var lastGroup = '';
    rows.forEach(function (r, i) {
      var tr = h('tr');
      if (r.group) {
        lastGroup = r.group;
        var g = h('td', 'agd-fd-lab', r.group);
        if (r.span > 1) g.rowSpan = r.span;
        tr.appendChild(g);
      }
      groupOf[r.key] = lastGroup;
      tr.appendChild(h('td', 'agd-fd-lab', r.label));
      tr.appendChild(valueCell(r, true, i));
      tr.appendChild(valueCell(r, false, i));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    paper.appendChild(table);
    sheet.appendChild(paper);
    formCard.appendChild(sheet);
    work.appendChild(formCard);

    function valueCell(r, prev, i) {
      var key = prev ? r.key + PREV : r.key;
      // agd-k-loop — 생성 중 깜빡임이 일시정지 때 멈춘다
      var td = h('td', 'agd-fd-val agd-k-loop' + (r.sum ? ' is-auto' : ''));
      var span = h('span');
      td.appendChild(span);
      cells[key] = { td: td, span: span, row: r, prev: prev, index: i };
      cellOrder.push(key);
      return td;
    }

    var panel = h('div', 'agd-k-card agd-fd-panel');
    var tabs = h('div', 'agd-k-tabs');
    var tabCheck = h('span', 'agd-k-tab');
    tabCheck.appendChild(h('span', null, L.tabCheck));
    var tabCount = h('span', 'agd-k-tab-count');
    tabCheck.appendChild(tabCount);
    var tabEv = h('span', 'agd-k-tab', L.tabEvidence);
    tabs.appendChild(tabCheck);
    tabs.appendChild(tabEv);
    panel.appendChild(tabs);
    var pbody = h('div', 'agd-fd-pbody');
    panel.appendChild(pbody);
    work.appendChild(panel);

    main.appendChild(work);
    root.appendChild(main);
    screen.appendChild(root);

    /* ---- 상태 */
    var state = null;

    function fresh() {
      return {
        files: [],
        gen: 'none', // none · running · done
        stage: 0,
        values: {},
        base: {},
        resolved: {},
        tab: 'check',
        selected: null,
        detailOpen: false,
        sourceOpen: true,
        info: ''
      };
    }

    function flagById(id) {
      for (var i = 0; i < flags.length; i++) if (flags[i].id === id) return flags[i];
      return null;
    }

    function isOpen(f) {
      return !state.resolved[f.id];
    }

    function openWarn() {
      if (state.gen !== 'done') return 0;
      return flags.filter(function (f) { return f.severity === 'warn' && isOpen(f); }).length;
    }

    /* 자동 합계 — 원본은 서버가 계산한다 */
    function recalc() {
      rows.forEach(function (r) {
        if (!r.sum) return;
        ['', PREV].forEach(function (suffix) {
          var total = 0;
          r.sum.forEach(function (k) { total += num(state.values[k + suffix]); });
          state.values[r.key + suffix] = fmt(total);
        });
      });
    }

    function draftValues() {
      var v = {};
      rows.forEach(function (r) {
        if (r.sum) return;
        v[r.key] = r.value || '';
        v[r.key + PREV] = r.prev || '';
      });
      return v;
    }

    function ready() {
      if (state.files.length === 0) return false;
      for (var i = 0; i < state.files.length; i++) if (state.files[i].state !== 'ready') return false;
      return true;
    }

    /* 칸 표시 — 직접 수정 · 확인 항목(warn · info). 원본 순서와 같다 */
    function marks() {
      var out = {};
      if (state.gen !== 'done') return out;
      cellOrder.forEach(function (k) {
        var c = cells[k];
        if (!c.row.sum && state.values[k] !== (state.base[k] || '')) out[k] = 'edited';
      });
      flags.forEach(function (f) {
        if (!isOpen(f)) return;
        (f.cells || []).forEach(function (k) {
          if (f.severity === 'warn' || out[k] !== 'warn') out[k] = f.severity;
        });
      });
      return out;
    }

    function pathOf(key) {
      var c = cells[key];
      if (!c) return '';
      var r = c.row;
      var col = c.prev ? form.head.prev : form.head.cur;
      return [form.section, (groupOf[r.key] ? groupOf[r.key] + ' ' : '') + r.label, col].join(PATH_SEP);
    }

    /* ---- 그리기 */

    function setStep(s, st, sub) {
      if (s.state !== st) {
        s.state = st;
        s.el.setAttribute('data-s', st);
        s.num.textContent = '';
        if (st === 'done') s.num.appendChild(icon('check'));
        else s.num.textContent = String(s.index + 1);
      }
      s.sub.textContent = sub;
    }

    function renderFlow() {
      var done = state.gen === 'done';
      var running = state.gen === 'running';
      var warn = openWarn();
      setStep(steps[0], 'done', (disc.name || '') + ' · ' + (disc.period || ''));
      setStep(
        steps[1],
        done ? 'done' : 'active',
        running ? L.status.running : state.files.length > 0 ? L.flow.sourceCount(state.files.length) : L.flow.sourceSub
      );
      setStep(
        steps[2],
        !done ? 'disabled' : warn ? 'active' : 'done',
        !done ? L.flow.reviewSub : warn ? L.flow.reviewOpen(warn) : L.flow.reviewDone
      );
      setStep(steps[3], !done ? 'disabled' : warn ? 'idle' : 'active', L.flow.downloadSub);
    }

    function renderBar() {
      var running = state.gen === 'running';
      var done = state.gen === 'done';
      pill.hidden = !running && !done;
      pill.className = 'agd-k-pill ' + (running ? 'is-info' : 'is-success');
      pill.textContent = running ? L.status.running : done ? L.status.done : '';
      resetBtn.classList.toggle('is-disabled', running);
    }

    function fileRow(f) {
      var row = h('div', 'agd-fd-file');
      row.appendChild(h('span', 'agd-fd-ftype', f.type || ''));
      row.appendChild(h('span', 'agd-fd-fname', f.name));
      row.appendChild(h('span', 'agd-fd-fsize', f.size || ''));
      var st = h('span', 'agd-k-tag agd-fd-fstate' + (f.state === 'ready' ? ' is-success' : ''));
      if (f.state === 'uploading') st.appendChild(h('span', 'agd-k-spin agd-fd-tagspin'));
      st.appendChild(h('span', null, L.fileState[f.state] || ''));
      row.appendChild(st);
      row.appendChild(btn(L.removeFile, 'is-xs agd-fd-fremove'));
      return row;
    }

    function renderSource() {
      var running = state.gen === 'running';
      var done = state.gen === 'done';
      var n = state.files.length;
      // 접힘은 표시만 바꾼다(전환이 끝나기를 기다리지 않는다)
      srcBody.hidden = !state.sourceOpen;
      source.classList.toggle('is-folded', !state.sourceOpen);
      srcHint.textContent = done && !state.sourceOpen ? state.info : L.sourceHint;
      srcToggle.hidden = !done;

      filesBox.hidden = n === 0;
      filesHead.textContent = L.sourceCount(n);
      for (var i = 0; i < n; i++) {
        var f = state.files[i];
        var key = f.name + '|' + f.state;
        var old = fileList.children[i];
        if (old && old.getAttribute('data-k') === key) continue;
        var row = fileRow(f);
        row.setAttribute('data-k', key);
        if (old) {
          row.classList.add('is-same'); // 상태만 바뀐 줄은 다시 떠오르지 않게
          fileList.replaceChild(row, old);
        } else {
          fileList.appendChild(row);
        }
      }
      while (fileList.children.length > n) fileList.removeChild(fileList.lastChild);

      progress.hidden = !running;
      stageEls.forEach(function (s, i) {
        var st = i < state.stage ? 'done' : i === state.stage ? 'run' : 'todo';
        if (s.state === st) return;
        s.state = st;
        s.el.classList.toggle('is-todo', st === 'todo');
        s.mark.textContent = '';
        if (st === 'done') s.mark.textContent = '✓';
        else if (st === 'run') s.mark.appendChild(h('span', 'agd-k-spin agd-fd-stagespin'));
        else s.mark.textContent = '·';
      });

      var uploaded = state.files.filter(function (x) { return x.state === 'ready'; }).length;
      var ok = ready();
      genWhy.hidden = running || ok;
      genWhy.textContent = n === 0 ? L.needFiles : L.readingFiles(uploaded, n);
      genBtn.className =
        'agd-k-btn agd-fd-gen' +
        (done ? '' : ' is-primary') +
        (!ok ? ' is-disabled' : '') +
        (running ? ' is-busy' : '');
      genSpin.hidden = !running;
      genText.textContent = running ? L.generating : done ? L.regenerate : L.generate;
    }

    function renderForm() {
      var running = state.gen === 'running';
      var done = state.gen === 'done';
      root.classList.toggle('is-busy', running);
      cmpBtn.classList.toggle('is-disabled', running);
      dlBtn.classList.toggle('is-disabled', !done);
      legend.hidden = !done;
      formNote.hidden = state.gen !== 'none';
      paintSheet();
    }

    function paintSheet() {
      var m = marks();
      cellOrder.forEach(function (k) {
        var c = cells[k];
        var v = state.values[k] || '';
        if (c.span.textContent !== v) c.span.textContent = v;
        var mk = c.prev ? undefined : m[k];
        c.td.classList.toggle('is-edited', mk === 'edited');
        c.td.classList.toggle('is-info', mk === 'info');
        c.td.classList.toggle('is-warn', mk === 'warn');
        c.td.classList.toggle('is-selected', state.selected === k);
      });
    }

    function renderTabs() {
      tabCheck.classList.toggle('is-active', state.tab === 'check');
      tabEv.classList.toggle('is-active', state.tab === 'evidence');
      tabCount.textContent = state.gen === 'done' ? String(openWarn()) : '';
    }

    /* 접고 펴는 묶음(양식 검사 · 참고 N건) */
    function fold(cls, title, open, body) {
      var box = h('div', 'agd-fd-fold ' + cls + (open ? ' is-open' : ''));
      var fh = h('div', 'agd-fd-foldhead');
      if (typeof title === 'string') fh.appendChild(h('span', null, title));
      else fh.appendChild(title);
      fh.appendChild(icon('chevron'));
      box.appendChild(fh);
      var fb = h('div', 'agd-fd-foldbody');
      fb.hidden = !open;
      fb.appendChild(body);
      box.appendChild(fb);
      return box;
    }

    function mini(tableRows) {
      var t = h('table', 'agd-fd-mini');
      var tb = h('tbody');
      tableRows.forEach(function (r, i) {
        var tr = h('tr');
        r.forEach(function (x) { tr.appendChild(h(i === 0 ? 'th' : 'td', null, x)); });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      return t;
    }

    function card(f) {
      var st = state.resolved[f.id];
      var c = h('div', 'agd-fd-flag ' + (st ? 'is-done' : f.severity === 'warn' ? 'is-warn' : 'is-info'));
      c.setAttribute('data-flag', f.id);
      var title = h('div', 'agd-fd-flagtitle');
      title.appendChild(h('span', null, f.title));
      if (st) title.appendChild(tag(st === 'alt' ? L.flagStatus.alt : L.flagStatus.keep, 'success'));
      else title.appendChild(tag(L.flagStatus[f.severity], f.severity === 'warn' ? 'warning' : 'info'));
      c.appendChild(title);
      var acts = h('div', 'agd-fd-acts');
      if (!st) {
        c.appendChild(h('p', 'agd-fd-flagbody', f.body));
        if (f.table && f.table.length > 0) c.appendChild(mini(f.table));
        if (f.ref) c.appendChild(h('div', 'agd-fd-ref', L.refPrefix + f.ref));
        var hasAlt = !!f.alt;
        if (hasAlt) {
          var a = btn(f.altLabel, 'is-xs');
          a.setAttribute('data-act', 'alt');
          acts.appendChild(a);
        }
        acts.appendChild(btn(hasAlt ? L.keepValue : L.confirm, 'is-xs'));
        var n = (f.cells || []).length;
        if (n > 0) acts.appendChild(btn(n > 1 ? L.seeInFormAt(1, n) : L.seeInForm, 'is-xs is-ghost'));
      } else {
        acts.appendChild(btn(L.undo, 'is-xs'));
      }
      c.appendChild(acts);
      return c;
    }

    function flagList() {
      var frag = document.createDocumentFragment();
      var warnAll = flags.filter(function (f) { return f.severity === 'warn'; });
      var warns = warnAll.filter(isOpen);
      var infos = flags.filter(function (f) { return f.severity !== 'warn' && isOpen(f); });
      var finished = flags.filter(function (f) { return !isOpen(f); });
      if (warns.length === 0) frag.appendChild(notice(warnAll.length > 0 ? L.allDone : L.noWarn, 'success'));
      if (checks.all > 0) {
        var t = h('span', 'agd-fd-foldtitle');
        t.appendChild(document.createTextNode(L.checksTitle + ' '));
        t.appendChild(h('span', checks.ok === checks.all ? 'agd-fd-ok' : 'agd-fd-bad', L.checksPass(checks.ok, checks.all)));
        var ul = h('ul', 'agd-fd-checklist');
        ul.appendChild(h('li', null, L.checksAllPass));
        frag.appendChild(fold('agd-fd-checks', t, checks.ok < checks.all, ul));
      }
      warns.forEach(function (f) { frag.appendChild(card(f)); });
      if (infos.length > 0) {
        var body = h('div', 'agd-fd-groupbody');
        infos.forEach(function (f) { body.appendChild(card(f)); });
        // 원본: 남은 확인 필요가 없으면 참고 묶음이 저절로 펼쳐진다
        frag.appendChild(fold('agd-fd-group', L.infoGroup(infos.length), warns.length === 0, body));
      }
      finished.forEach(function (f) { frag.appendChild(card(f)); });
      return frag;
    }

    function fact(dl, label, content) {
      var d = h('div');
      d.appendChild(h('dt', null, label));
      var dd = h('dd');
      (content instanceof Array ? content : [content]).forEach(function (x) {
        if (x === null || x === undefined) return;
        dd.appendChild(typeof x === 'string' ? document.createTextNode(x) : x);
      });
      d.appendChild(dd);
      dl.appendChild(d);
    }

    function hasDetail(ev) {
      return !!(ev && ((ev.steps && ev.steps.length) || ev.quote || ev.interp || ev.notice));
    }

    function quoteText(p, q) {
      var text = q.text || '';
      var mark = q.highlight || '';
      var at = mark ? text.indexOf(mark) : -1;
      if (at < 0) {
        p.textContent = text;
        return;
      }
      p.appendChild(document.createTextNode(text.slice(0, at)));
      p.appendChild(h('mark', null, mark));
      p.appendChild(document.createTextNode(text.slice(at + mark.length)));
    }

    /* 근거 자세히 — ① 계산 내역 ② 매뉴얼 원문 ③ 적용한 해석(+ 노란 안내) */
    function detailBox(ev) {
      var box = h('div', 'agd-fd-detail');
      var n = 0;
      function section(title) {
        n += 1;
        var sec = h('div', 'agd-fd-dsec');
        var dh = h('div', 'agd-fd-dhead');
        dh.appendChild(h('span', 'agd-fd-dnum', n));
        dh.appendChild(h('span', null, title));
        sec.appendChild(dh);
        box.appendChild(sec);
        return sec;
      }
      if (ev.steps && ev.steps.length) {
        var sec1 = section(L.detailCalc);
        var ol = h('ol', 'agd-fd-calc');
        ev.steps.forEach(function (s) {
          var li = h('li', 'agd-fd-calcline' + (String(s.op).trim() === '=' ? ' is-result' : ''));
          li.appendChild(h('span', 'agd-fd-op', s.op));
          var what = h('span', 'agd-fd-what', s.label);
          if (s.note) what.appendChild(h('small', null, s.note));
          li.appendChild(what);
          li.appendChild(h('span', 'agd-fd-numv', s.value));
          ol.appendChild(li);
        });
        sec1.appendChild(ol);
      }
      if (ev.quote) {
        var sec2 = section(L.detailQuotesOf(ev.quote.doc || ''));
        var bq = h('div', 'agd-fd-quote');
        bq.appendChild(h('span', 'agd-fd-pg', ev.quote.page || ''));
        var p = h('p');
        quoteText(p, ev.quote);
        bq.appendChild(p);
        sec2.appendChild(bq);
      }
      if (ev.interp || ev.notice) {
        var sec3 = section(L.detailInterp);
        if (ev.interp) sec3.appendChild(h('p', 'agd-fd-interp', ev.interp));
        if (ev.notice) {
          var nt = h('div', 'agd-fd-dnotice', ev.notice);
          if (ev.flag && flagById(ev.flag)) nt.appendChild(h('span', 'agd-fd-golink', L.detailGoFlag));
          sec3.appendChild(nt);
        }
      }
      return box;
    }

    function evidenceView() {
      var frag = document.createDocumentFragment();
      var k = state.selected;
      if (!k || !cells[k]) {
        frag.appendChild(notice(L.evidenceEmpty));
        return frag;
      }
      var c = cells[k];
      var ev = c.prev ? null : evidence[c.row.key];
      var top = h('div', 'agd-fd-evhead');
      top.appendChild(h('div', 'agd-fd-path', pathOf(k)));
      top.appendChild(h('div', 'agd-fd-big', state.values[k] || L.emptyValue));
      frag.appendChild(top);
      var dl = h('dl', 'agd-fd-facts');
      if (ev) {
        fact(dl, L.source, tag(L.confidence[ev.confidence] || '', ev.confidence === 'estimated' ? 'warning' : 'info'));
        if (ev.file) fact(dl, L.usedFile, [ev.file, h('br'), ev.where || '']);
        if (ev.unit) fact(dl, L.unit, ev.unit);
        if (ev.how) fact(dl, L.how, ev.how);
        if (ev.manual) fact(dl, L.manual, ev.manual);
      } else if (c.row.sum) {
        fact(dl, L.source, [tag(L.sourceAuto), ' ' + L.autoBody]);
      } else {
        fact(dl, L.source, L.formValue);
      }
      frag.appendChild(dl);
      if (hasDetail(ev)) {
        var more = h('span', 'agd-fd-more' + (state.detailOpen ? ' is-open' : ''));
        more.appendChild(h('span', null, state.detailOpen ? L.detailLess : L.detailMore));
        more.appendChild(h('span', 'agd-fd-arrow', L.arrow));
        frag.appendChild(more);
        if (state.detailOpen) frag.appendChild(detailBox(ev));
      }
      return frag;
    }

    function renderPanel() {
      renderTabs();
      pbody.textContent = '';
      if (state.gen === 'running') {
        var run = h('div', 'agd-k-notice is-info agd-fd-running');
        run.appendChild(h('span', 'agd-k-spin'));
        run.appendChild(h('span', null, L.running));
        pbody.appendChild(run);
      } else if (state.tab === 'evidence') {
        pbody.appendChild(evidenceView());
      } else if (state.gen !== 'done') {
        pbody.appendChild(notice(L.checkEmpty));
      } else {
        pbody.appendChild(flagList());
      }
    }

    function render() {
      renderFlow();
      renderBar();
      renderSource();
      renderForm();
      renderPanel();
    }

    function reset() {
      state = fresh();
      recalc();
      fileList.textContent = '';
      stageEls.forEach(function (s) { s.state = null; });
      steps.forEach(function (s) { s.state = null; });
      cellOrder.forEach(function (k) {
        cells[k].td.classList.remove('is-fill');
        cells[k].td.style.animationDelay = '';
      });
      render();
      main.scrollTop = 0;
      sheet.scrollTop = 0;
      pbody.scrollTop = 0;
    }

    /* 컨테이너 안에서만 부드럽게 스크롤(ctx.sleep 단계 — 일시정지 · 취소를 따른다) */
    function glide(box, top, ctx, ms) {
      var from = box.scrollTop;
      var to = Math.max(0, Math.min(top, box.scrollHeight - box.clientHeight));
      if (ctx.instant || Math.abs(to - from) < 2) {
        box.scrollTop = to;
        return Promise.resolve();
      }
      var n = 9;
      var i = 0;
      function next() {
        i += 1;
        var t = 1 - Math.pow(1 - i / n, 3);
        box.scrollTop = Math.round(from + (to - from) * t);
        return i >= n ? null : ctx.sleep((ms || 450) / n).then(next);
      }
      return Promise.resolve(next());
    }

    /* 값이 바뀐 칸을 표 순서로 잠깐 물들인다(값 자체는 이미 한꺼번에 들어가 있다) */
    function ripple(keys, ctx, stagger) {
      if (ctx.instant) return;
      var rowsSeen = [];
      keys.forEach(function (k) {
        var c = cells[k];
        if (!c) return;
        if (rowsSeen.indexOf(c.index) < 0) rowsSeen.push(c.index);
        c.td.style.animationDelay = rowsSeen.indexOf(c.index) * (stagger || 0) + 'ms';
        replay(c.td, 'is-fill');
      });
    }

    var actions = {
      /* 자료 올리기 — 파일 줄이 하나씩 붙고(업로드 중) 차례로 올림 완료 */
      upload: function (a, ctx) {
        var list = sourceFiles.map(function (f) {
          return { name: f.name, size: f.size, type: f.type, state: 'uploading' };
        });
        if (ctx.instant) {
          list.forEach(function (f) { f.state = 'ready'; });
          state.files = list;
          render();
          return null;
        }
        state.files = [];
        var i = 0;
        var j = 0;
        function add() {
          if (i >= list.length) return null;
          state.files.push(list[i]);
          i += 1;
          renderFlow();
          renderSource();
          return ctx.sleep(a.stagger || 350).then(add);
        }
        function settle() {
          if (j >= state.files.length) return null;
          state.files[j].state = 'ready';
          j += 1;
          renderSource();
          return ctx.sleep(a.settle || 500).then(settle);
        }
        return add().then(settle);
      },

      /* [초안 생성] — 생성 중 · 진행 줄 · 값 칸 깜빡임 · 패널 안내.
         원본 페이지를 내려 보듯 본문을 끝까지 내려 진행 줄과 양식 · 패널이 함께 보이게 한다(공시 줄은 위에 붙어 있다) */
      generate: function (a, ctx) {
        state.gen = 'running';
        state.stage = 0;
        state.sourceOpen = true;
        state.selected = null;
        state.tab = 'check';
        render();
        var ms = a.ms || 600;
        var scroll = Math.min(450, ms);
        return glide(main, main.scrollHeight, ctx, scroll).then(function () {
          return ctx.sleep(Math.max(0, ms - scroll));
        });
      },

      /* 진행 단계 — 앞 단계는 ✓, 이 단계는 스피너 */
      stage: function (a, ctx) {
        var at = -1;
        for (var i = 0; i < L.steps.length; i++) if (L.steps[i][0] === a.key) at = i;
        if (at < 0) return null;
        state.stage = at;
        renderSource();
        return ctx.sleep(a.ms || 700);
      },

      /* 완료 — 자료 칸 접힘 · 값 한꺼번에 · 칸 표시 · 확인 필요 · 토스트 */
      reveal: function (a, ctx) {
        state.gen = 'done';
        state.stage = L.steps.length;
        state.values = draftValues();
        recalc();
        state.base = copy(state.values);
        state.sourceOpen = false;
        state.info = L.draftInfo(U.time.ymdhm(), state.files.length);
        state.tab = 'check';
        render();
        // 자료 칸이 접히면 본문이 창에 들어온다 — 스크롤 위치를 처음으로
        main.scrollTop = 0;
        pbody.scrollTop = 0;
        sheet.scrollTop = 0;
        ripple(cellOrder, ctx, RIPPLE_MS);
        U.toast(screen, L.doneToast(openWarn(), checks.ok, checks.all), { tone: 'info', ms: 3600 }, ctx);
        return ctx.sleep(a.ms || 300);
      },

      /* 칸을 눌렀다 — 선택 테두리 · 값 근거 탭 */
      select: function (a, ctx) {
        if (!cells[a.cell]) return null;
        state.selected = a.cell;
        state.tab = 'evidence';
        paintSheet();
        renderPanel();
        pbody.scrollTop = 0;
        return ctx.sleep(a.ms || 1300);
      },

      /* [근거 자세히 ▾] — ① 줄마다 차례로 · ② · ③(패널 안에서만 스크롤해 보이게) */
      detail: function (a, ctx) {
        state.detailOpen = true;
        state.tab = 'evidence';
        renderPanel();
        var box = pbody.querySelector('.agd-fd-detail');
        if (!box) return ctx.sleep(a.ms || 0);
        if (ctx.instant) {
          var last = box.lastChild;
          if (last) U.reveal(pbody, last);
          return null;
        }
        var parts = [];
        var secs = box.querySelectorAll('.agd-fd-dsec');
        for (var i = 0; i < secs.length; i++) {
          var lines = secs[i].querySelectorAll('.agd-fd-calcline');
          if (i > 0) parts.push({ el: secs[i], gap: 450 });
          for (var j = 0; j < lines.length; j++) parts.push({ el: lines[j], gap: 170 });
        }
        parts.forEach(function (p) { p.el.classList.add('is-wait'); });
        var spent = 0;
        var k = 0;
        function next() {
          if (k >= parts.length) return null;
          var p = parts[k];
          k += 1;
          return ctx.sleep(p.gap).then(function () {
            spent += p.gap;
            p.el.classList.remove('is-wait');
            p.el.classList.add('is-in');
            U.reveal(pbody, p.el);
            return next();
          });
        }
        return next().then(function () {
          return ctx.sleep(Math.max(300, (a.ms || 3000) - spent));
        });
      },

      /* 안내의 [확인 필요 카드 보기] — 확인 필요 탭 · 그 카드에 파란 링 */
      goFlag: function (a, ctx) {
        state.tab = 'check';
        renderPanel();
        pbody.scrollTop = 0;
        var cardEl = pbody.querySelector('[data-flag="' + a.id + '"]');
        if (cardEl) {
          U.reveal(pbody, cardEl);
          if (!ctx.instant) replay(cardEl, 'is-flash');
        }
        return ctx.sleep(a.ms || 900);
      },

      /* 대체값 쓰기 — 관련 칸 값 바꿈(직접 수정 표시) · 합계 다시 계산 · 카드 처리됨 · 모두 처리 */
      alt: function (a, ctx) {
        var f = flagById(a.flag);
        if (!f || !f.alt) return null;
        state.resolved[f.id] = 'alt';
        var changed = [];
        for (var k in f.alt) {
          if (!Object.prototype.hasOwnProperty.call(f.alt, k)) continue;
          state.values[k] = f.alt[k];
          changed.push(k);
        }
        var before = copy(state.values);
        recalc();
        rows.forEach(function (r) {
          if (r.sum && before[r.key] !== state.values[r.key]) changed.push(r.key);
        });
        state.tab = 'check';
        render();
        pbody.scrollTop = 0;
        ripple(changed, ctx, 0);
        U.toast(screen, L.altDone(f.altLabel), { tone: 'info', ms: 3000 }, ctx);
        var ms = a.ms || 2600;
        var doneCard = pbody.querySelector('[data-flag="' + f.id + '"]');
        if (ctx.instant || !doneCard) return ctx.sleep(ms);
        // 맨 위 "모두 처리" 안내를 먼저 보이고, 잠시 뒤 패널 안에서만 내려 처리된 카드("값 바꿈")를 보인다
        var look = Math.round(ms * 0.45);
        return ctx.sleep(look)
          .then(function () {
            var c = pbody.getBoundingClientRect();
            var r = doneCard.getBoundingClientRect();
            var over = r.bottom - c.bottom + 10;
            return over > 0 ? glide(pbody, pbody.scrollTop + over, ctx, 500) : null;
          })
          .then(function () {
            return ctx.sleep(Math.max(0, ms - look - 500));
          });
      }
    };

    /* 커서 목표 — 보이지 않으면(좁은 화면에서 숨은 패널 등) null → 엔진이 그 커서 장면을 건너뛴다 */
    function target(key) {
      var parts = String(key).split(':');
      var el = null;
      var box = null;
      if (key === 'pick-file') el = pickBtn;
      else if (key === 'generate') el = genBtn;
      else if (key === 'download') el = dlBtn;
      else if (parts[0] === 'cell') {
        el = cells[parts[1]] ? cells[parts[1]].td : null;
        box = sheet;
      } else if (parts[0] === 'tab') {
        el = parts[1] === 'evidence' ? tabEv : tabCheck;
      } else if (key === 'detail') {
        el = pbody.querySelector('.agd-fd-more');
        box = pbody;
      } else if (key === 'go-flag') {
        el = pbody.querySelector('.agd-fd-golink');
        box = pbody;
      } else if (parts[0] === 'flag') {
        var cardEl = pbody.querySelector('[data-flag="' + parts[1] + '"]');
        el = cardEl ? cardEl.querySelector('[data-act="' + (parts[2] || 'alt') + '"]') : null;
        box = pbody;
      }
      if (!el || el.offsetParent === null) return null;
      if (box) U.reveal(box, el);
      U.reveal(main, el);
      return el;
    }

    return { reset: reset, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('form-draft', { mount: mount });
})(window, document);
