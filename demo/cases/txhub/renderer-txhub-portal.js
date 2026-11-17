/*
 * 화면 유형 'txhub-portal' — 클라우드 테스트 자동화(TaaS) 포털 · 성능 테스트
 * 포트폴리오 캡처(scenario-list · plan-config · schedule · dashboard · functional-tests · workspace)의 배치 · 문구를 재구성했다.
 *   왼쪽 아이콘 메뉴 · 위 머리(Company · WorkSpace · Project) · 탭(전체 현황 · 스케줄 현황) · 본문 카드
 *   본문 화면: 시나리오 조회(scen) → 시나리오 · 플랜 · 스케줄 그룹(plan) → 스케줄 캘린더(cal) → Runs(runs) → 대시보드(dash)
 *
 * 각본 동작(actions): pick · type · slide · throughput · glide · save · group · run · page · filters · toggleNow · progress · dash
 * 커서 목표(target): 'row:<id>' · 'field:planName' · 'save' · 'group-add' · 'run' · 'subtab:<all|schedule>' · 'toggle:now' · 'result:new'
 * 기다림은 ctx.sleep만 쓴다(일시정지 · 취소). 모든 동작은 ctx.instant면 최종 상태를 바로 그린다.
 * 글은 textContent로만 넣는다. 본문(.agd-tx-body) 안에서만 스크롤한다.
 */
(function (window, document) {
  'use strict';
  if (!window.AgentDemo || !window.AgentDemo.util) return;

  var U = window.AgentDemo.util;
  var h = U.h;
  var icon = U.icon;
  var SVGNS = 'http://www.w3.org/2000/svg';

  var ST = ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  U.addIcons({
    txGauge: '<svg viewBox="0 0 24 24"' + ST + '><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><path d="M13.1 10.9l3.4-3.4"/></svg>',
    txStack: '<svg viewBox="0 0 24 24"' + ST + '><ellipse cx="12" cy="6.5" rx="8" ry="3"/><path d="M4 6.5V12c0 1.7 3.6 3 8 3s8-1.3 8-3V6.5M4 12v5.5c0 1.7 3.6 3 8 3s8-1.3 8-3V12"/></svg>',
    txFlow: '<svg viewBox="0 0 24 24"' + ST + '><path d="M4 4v16h16"/><path d="M8 8h9l-2-2M8 13h7l-2-2M8 17h10l-2-2"/></svg>',
    txTarget: '<svg viewBox="0 0 24 24"' + ST + '><circle cx="11" cy="13" r="7"/><circle cx="11" cy="13" r="3"/><path d="M11 13l9-9M16 4h4v4"/></svg>',
    txHammer: '<svg viewBox="0 0 24 24"' + ST + '><path d="M13 4l7 7-3 3-7-7zM10 7l-6 6 3 3 6-6"/><path d="M4 20l3-3"/></svg>',
    txClip: '<svg viewBox="0 0 24 24"' + ST + '><rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 3.5h6v3H9zM9 13l2 2 4-4"/></svg>',
    txSwap: '<svg viewBox="0 0 24 24"' + ST + '><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M14 7h4v4M10 17H6v-4"/></svg>',
    txUser: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity=".22"/><circle cx="12" cy="9.5" r="3.6"/><path d="M5.6 18.4c1.4-2.6 3.7-4 6.4-4s5 1.4 6.4 4"/></svg>',
    txOut: '<svg viewBox="0 0 24 24"' + ST + '><path d="M14 4H6v16h8M10 12h10M17 9l3 3-3 3"/></svg>',
    txTrash: '<svg viewBox="0 0 24 24"' + ST + '><path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/></svg>',
    txCal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h2v2h6V3h2v2h2a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h2zM6 10v9h12v-9zm7 4h4v4h-4z"/></svg>',
    txPlay: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    txClock: '<svg viewBox="0 0 24 24"' + ST + '><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    txList: '<svg viewBox="0 0 24 24"' + ST + '><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/></svg>',
    txCols: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="6" width="4" height="12" rx="1"/><rect x="10" y="6" width="4" height="12" rx="1"/><rect x="16" y="6" width="4" height="12" rx="1"/></svg>',
    txFilter: '<svg viewBox="0 0 24 24"' + ST + '><path d="M4 7h16M7 12h10M10 17h4"/></svg>',
    txDensity: '<svg viewBox="0 0 24 24"' + ST + ' stroke-width="2.4"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
    txExport: '<svg viewBox="0 0 24 24"' + ST + '><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/></svg>',
    txReport: '<svg viewBox="0 0 24 24"' + ST + '><path d="M4 7h8M4 12h6M4 17h6"/><circle cx="16" cy="12" r="3.6"/><path d="M18.6 14.6l2.4 2.4"/></svg>',
    txGrid: '<svg viewBox="0 0 24 24"' + ST + '><rect x="5" y="5" width="5.5" height="5.5" rx="1"/><rect x="13.5" y="5" width="5.5" height="5.5" rx="1"/><rect x="5" y="13.5" width="5.5" height="5.5" rx="1"/><rect x="13.5" y="13.5" width="5.5" height="5.5" rx="1"/></svg>',
    txRows: '<svg viewBox="0 0 24 24"' + ST + '><rect x="5" y="5" width="14" height="5.5" rx="1"/><rect x="5" y="13.5" width="14" height="5.5" rx="1"/></svg>',
    txCaret: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>',
    txLeft: '<svg viewBox="0 0 24 24"' + ST + ' stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg>',
    txRight: '<svg viewBox="0 0 24 24"' + ST + ' stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg>',
    txAlert: '<svg viewBox="0 0 24 24"' + ST + '><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3v.2"/></svg>',
    txReset: '<svg viewBox="0 0 24 24"' + ST + ' stroke-width="2.2"><path d="M18 9a7 7 0 10.6 6M18 4v5h-5"/></svg>'
  });

  /* 원본 화면 문구 */
  var L = {
    title: 'Dashboard',
    ctx: ['Company', 'WorkSpace', 'Project'],
    subAll: '전체 현황',
    subSchedule: '스케줄 현황',
    scenList: '시나리오 조회',
    create: '생성',
    scenCols: ['ID', 'Name', 'Desc', ''],
    rowsPer: 'Rows per page:',
    scn: '시나리오',
    scnView: '시나리오 보기',
    reqCols: ['Request 명', 'Think Time', 'method', 'url'],
    planInfo: '플랜 정보',
    add: '추가',
    planCols: ['플랜 명', 'Total User', 'Duration (Min)'],
    groupInfo: '스케줄 그룹 정보',
    empty: '조회된 데이터가 없습니다.',
    plan: '플랜',
    save: '저장',
    dry: 'Dry Run',
    run: 'Run Test',
    running: '실행 중',
    planName: '플랜 명',
    planDesc: '플랜 설명',
    config: 'Test Configuration',
    runsLeft: '잔여 횟수',
    minLeft: '잔여 시간 (분)',
    adv: 'Advanced Option',
    tpMethod: 'Throughput 계산방식',
    tpTarget: 'Target Throughput (분)',
    tpDescLabel: 'Throughput 계산방식 설명',
    tpDesc: '각 User가 독립적으로 설정된 목표 Throughput을 유지하려고 합니다. User마다 동일한 처리량을 실행하며, 총 처리량은 User 수에 비례해 증가합니다.',
    group: '스케줄 그룹',
    nowToggle: '즉시 실행 포함',
    pickPh: '옵션을 선택해주세요',
    start: '시작 일자',
    end: '종료 일자',
    schedule: '스케줄',
    today: 'Today',
    projPick: '프로젝트 선택',
    week: ['일', '월', '화', '수', '목', '금', '토'],
    runs: 'Runs',
    project: 'Project',
    kind: '구분',
    tools: [['txCols', 'Columns'], ['txFilter', 'Filters'], ['txDensity', 'Density'], ['txExport', 'Export']],
    runCols: ['시나리오명', '구분', '테스트 시작 일시', '테스트 종료 일시', '진행률', 'Status', '실행 결과'],
    dashTitle: '계약 대비 수행 현황',
    chartCount: '월별 테스트 현황(건수)',
    chartMin: '월별 테스트 현황(분)',
    legend: [['s', 'Success'], ['f', 'Fail'], ['c', 'Cancel'], ['r', 'Scheduled']],
    status: { complete: 'Complete', fail: 'Fail', cancel: 'Cancel', running: 'Running' }
  };

  function txt(el, s) {
    el.textContent = s;
    return el;
  }

  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  function card(title, cls) {
    var c = h('div', 'agd-tx-card' + (cls ? ' ' + cls : ''));
    var head = h('div', 'agd-tx-chead');
    head.appendChild(h('p', 'agd-tx-ctitle', title));
    c.appendChild(head);
    return { el: c, head: head };
  }

  function btn(label, cls, ico) {
    var b = h('span', 'agd-tx-btn' + (cls ? ' ' + cls : ''));
    if (ico) b.appendChild(icon(ico));
    b.appendChild(h('span', 'agd-tx-btntext', label));
    return b;
  }

  /* MUI 겉선 입력칸 — 떠 있는 이름표 + 값 */
  function field(label, value, cls, ico) {
    var f = h('div', 'agd-tx-field' + (cls ? ' ' + cls : ''));
    if (label) f.appendChild(h('span', 'agd-tx-flabel', label));
    var v = h('span', 'agd-tx-fval', value || '');
    f.appendChild(v);
    if (ico) f.appendChild(icon(ico, 'agd-tx-fico'));
    return { el: f, val: v };
  }

  function tr(cls, cells) {
    var r = h('div', 'agd-tx-tr' + (cls ? ' ' + cls : ''));
    cells.forEach(function (c) {
      r.appendChild(typeof c === 'string' ? h('span', 'agd-tx-td', c) : c);
    });
    return r;
  }

  function pager(text) {
    var p = h('div', 'agd-tx-pager');
    p.appendChild(h('span', 'agd-tx-rpp', L.rowsPer));
    var n = h('span', 'agd-tx-rppval', '10');
    n.appendChild(icon('txCaret'));
    p.appendChild(n);
    p.appendChild(h('span', 'agd-tx-range', text));
    p.appendChild(icon('txLeft', 'agd-tx-pgbtn is-off'));
    p.appendChild(icon('txRight', 'agd-tx-pgbtn'));
    return p;
  }

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var plan = app.plan || {};
    var credits = app.credits || { runs: 0, minutes: 0 };
    var cal = app.calendar || { y: 2026, m: 11, today: 1, events: [] };
    var dashData = app.dashboard || {};
    screen.textContent = '';

    var root = h('div', 'agd-k agd-tx');

    /* ---- 왼쪽 아이콘 메뉴 */
    var rail = h('div', 'agd-tx-rail');
    rail.appendChild(h('span', 'agd-tx-mark'));
    ['txGauge', 'txStack', 'txFlow', 'txTarget', 'txHammer', 'txClip'].forEach(function (n, i) {
      rail.appendChild(icon(n, 'agd-tx-railbtn' + (i === 1 ? ' is-active' : '')));
    });
    rail.appendChild(h('span', 'agd-tx-railgap'));
    ['txSwap', 'txUser', 'txOut'].forEach(function (n) {
      rail.appendChild(icon(n, 'agd-tx-railbtn'));
    });
    root.appendChild(rail);

    var main = h('div', 'agd-tx-main');

    /* ---- 머리 · 탭 */
    var top = h('div', 'agd-tx-top');
    top.appendChild(h('p', 'agd-tx-title', L.title));
    var ctxBox = h('div', 'agd-tx-ctx');
    [app.company, app.workspace, app.project].forEach(function (v, i) {
      var g = h('span', 'agd-tx-ctxitem' + (i === 2 ? ' is-project' : ''));
      g.appendChild(h('span', 'agd-tx-ctxlabel', L.ctx[i]));
      var b = h('span', 'agd-tx-ctxval', v || '');
      if (i > 0) b.appendChild(icon('txCaret'));
      g.appendChild(b);
      ctxBox.appendChild(g);
    });
    top.appendChild(ctxBox);
    main.appendChild(top);

    var subtabs = h('div', 'agd-tx-subtabs');
    var subAll = h('span', 'agd-tx-subtab', L.subAll);
    var subSchedule = h('span', 'agd-tx-subtab', L.subSchedule);
    subtabs.appendChild(subAll);
    subtabs.appendChild(subSchedule);
    main.appendChild(subtabs);

    var body = h('div', 'agd-tx-body');
    main.appendChild(body);
    root.appendChild(main);
    screen.appendChild(root);

    var pages = {};
    function page(id) {
      var p = h('div', 'agd-tx-page agd-tx-p-' + id);
      body.appendChild(p);
      pages[id] = p;
      return p;
    }

    /* ---- ① 시나리오 조회 */
    var pScen = page('scen');
    var cScen = card(L.scenList, 'agd-tx-scenlist');
    cScen.head.appendChild(btn(L.create, 'is-primary'));
    var scenTable = h('div', 'agd-tx-table agd-tx-t-scen');
    scenTable.appendChild(tr('is-head', L.scenCols));
    var scenRows = {};
    (app.scenarios || []).forEach(function (s) {
      var del = h('span', 'agd-tx-td agd-tx-del');
      del.appendChild(icon('txTrash'));
      var r = tr(null, [String(s.id), s.name, s.desc || '', del]);
      scenTable.appendChild(r);
      scenRows[s.id] = r;
    });
    cScen.el.appendChild(scenTable);
    var n = (app.scenarios || []).length;
    cScen.el.appendChild(pager('1–' + n + ' of ' + n));
    pScen.appendChild(cScen.el);

    /* ---- ② 시나리오 · 플랜 · 스케줄 그룹 */
    var pPlan = page('plan');
    var colL = h('div', 'agd-tx-col agd-tx-col-l');
    var colR = h('div', 'agd-tx-col agd-tx-col-r');

    var cScn = card(L.scn, 'agd-tx-scn');
    var view = h('span', 'agd-tx-link');
    view.appendChild(icon('txList'));
    view.appendChild(h('span', null, L.scnView));
    cScn.head.appendChild(view);
    var scnField = field(L.scn, '', 'is-select', 'txCaret');
    cScn.el.appendChild(scnField.el);
    var reqTable = h('div', 'agd-tx-table agd-tx-t-req');
    reqTable.appendChild(tr('is-head', L.reqCols));
    var reqRows = (app.requests || []).map(function (q) {
      var m = h('span', 'agd-tx-td agd-tx-method', q.method);
      var r = tr('agd-tx-hide', [q.name, String(q.think), m, q.url]);
      reqTable.appendChild(r);
      return r;
    });
    cScn.el.appendChild(reqTable);
    colL.appendChild(cScn.el);

    var cPinfo = card(L.planInfo, 'agd-tx-pinfo');
    cPinfo.head.appendChild(btn(L.add, 'is-outline'));
    var pinfoTable = h('div', 'agd-tx-table agd-tx-t-plan');
    pinfoTable.appendChild(tr('is-head', L.planCols));
    var pinfoEmpty = h('p', 'agd-tx-empty', L.empty);
    pinfoTable.appendChild(pinfoEmpty);
    var pinfoRow = tr('agd-tx-hide is-sel', [plan.name || '', String(plan.users), String(plan.duration)]);
    pinfoTable.appendChild(pinfoRow);
    cPinfo.el.appendChild(pinfoTable);
    colL.appendChild(cPinfo.el);

    var cGroup = card(L.groupInfo, 'agd-tx-group');
    var groupAdd = btn(L.add, 'is-outline');
    cGroup.head.appendChild(groupAdd);
    var groupEmpty = h('p', 'agd-tx-empty', L.empty);
    cGroup.el.appendChild(groupEmpty);
    var g = app.group || {};
    var groupRow = h('div', 'agd-tx-grow agd-tx-hide');
    groupRow.appendChild(h('span', 'agd-tx-gname', g.name || ''));
    groupRow.appendChild(h('span', 'agd-tx-gkind', g.kind || ''));
    var gwhen = h('span', 'agd-tx-gwhen');
    gwhen.appendChild(icon('txClock'));
    gwhen.appendChild(h('span', null, g.when || ''));
    groupRow.appendChild(gwhen);
    cGroup.el.appendChild(groupRow);
    colL.appendChild(cGroup.el);

    var cPlan = card(L.plan, 'agd-tx-plan');
    var saveBtn = btn(L.save, 'is-primary');
    cPlan.head.appendChild(saveBtn);
    var acts = h('div', 'agd-tx-acts');
    acts.appendChild(icon('txAlert', 'agd-tx-alert'));
    acts.appendChild(btn(L.dry, 'is-green', 'txClock'));
    var runBtn = btn(L.run, 'is-primary', 'txPlay');
    acts.appendChild(runBtn);
    cPlan.el.appendChild(acts);
    var nameField = field(L.planName, '', 'agd-tx-name');
    var caret = h('i', 'agd-tx-caret');
    nameField.el.appendChild(caret);
    cPlan.el.appendChild(nameField.el);
    cPlan.el.appendChild(field('', L.planDesc, 'is-ph').el);

    var conf = h('div', 'agd-tx-box agd-tx-conf');
    var confHead = h('div', 'agd-tx-bhead');
    confHead.appendChild(h('p', 'agd-tx-btitle', L.config));
    function credit(ico, label) {
      var c = h('span', 'agd-tx-credit');
      c.appendChild(icon(ico));
      var t = h('span', 'agd-tx-credittext');
      t.appendChild(h('span', 'agd-tx-creditlabel', label));
      var v = h('span', 'agd-tx-creditval');
      t.appendChild(v);
      c.appendChild(t);
      confHead.appendChild(c);
      return v;
    }
    var runsLeft = credit('txGauge', L.runsLeft);
    var minLeft = credit('txReset', L.minLeft);
    conf.appendChild(confHead);

    function slider(def) {
      var w = h('div', 'agd-tx-slider');
      w.appendChild(h('p', 'agd-tx-slabel', def.label));
      var row = h('div', 'agd-tx-srow');
      var rail2 = h('div', 'agd-tx-srail');
      var track = h('div', 'agd-tx-track');
      var fill = h('i', 'agd-tx-fill');
      var thumb = h('i', 'agd-tx-thumb');
      var bub = h('span', 'agd-tx-bubble');
      thumb.appendChild(bub);
      track.appendChild(fill);
      track.appendChild(thumb);
      rail2.appendChild(track);
      var ticks = h('div', 'agd-tx-ticks');
      def.ticks.forEach(function (t) {
        var s = h('span', 'agd-tx-tick', String(t));
        s.style.left = ((t - def.min) / (def.max - def.min)) * 100 + '%';
        ticks.appendChild(s);
      });
      rail2.appendChild(ticks);
      row.appendChild(rail2);
      var box = h('span', 'agd-tx-sbox');
      row.appendChild(box);
      w.appendChild(row);
      conf.appendChild(w);
      return {
        el: w,
        set: function (v) {
          var p = Math.max(0, Math.min(1, (v - def.min) / (def.max - def.min))) * 100;
          fill.style.width = p + '%';
          thumb.style.left = p + '%';
          bub.textContent = String(v);
          box.textContent = String(v);
        }
      };
    }
    var sliders = {
      users: slider({ label: 'Total Users', min: 1, max: 10000, ticks: [1, 2000, 4000, 6000, 8000, 10000] }),
      duration: slider({ label: 'Duration (min)', min: 1, max: 600, ticks: [1, 120, 240, 360, 480, 600] }),
      ramp: slider({ label: 'Ramp up time', min: 0, max: 10, ticks: [0, 2, 4, 6, 8, 10] })
    };
    cPlan.el.appendChild(conf);

    var adv = h('div', 'agd-tx-box agd-tx-adv');
    var advHead = h('div', 'agd-tx-bhead');
    advHead.appendChild(h('p', 'agd-tx-btitle', L.adv));
    advHead.appendChild(icon('txReset', 'agd-tx-advreset'));
    adv.appendChild(advHead);
    var advGrid = h('div', 'agd-tx-advgrid');
    var m1 = h('div', 'agd-tx-advcell');
    m1.appendChild(h('p', 'agd-tx-advlabel', L.tpMethod));
    var mSel = field('', '', 'is-select agd-tx-small', 'txCaret');
    m1.appendChild(mSel.el);
    var m2 = h('div', 'agd-tx-advcell');
    var m2l = h('p', 'agd-tx-advlabel', L.tpTarget);
    m2l.appendChild(icon('txAlert', 'agd-tx-alert'));
    m2.appendChild(m2l);
    var tpField = field('', '', 'agd-tx-small');
    m2.appendChild(tpField.el);
    advGrid.appendChild(m1);
    advGrid.appendChild(m2);
    adv.appendChild(advGrid);
    adv.appendChild(h('p', 'agd-tx-advdesclabel', L.tpDescLabel));
    adv.appendChild(h('p', 'agd-tx-advdesc', L.tpDesc));
    cPlan.el.appendChild(adv);
    colR.appendChild(cPlan.el);

    pPlan.appendChild(colL);
    pPlan.appendChild(colR);

    /* ---- ③ 스케줄 캘린더 */
    var pCal = page('cal');
    var filt = h('div', 'agd-tx-col agd-tx-filters');
    function chipsField(cls) {
      var f = h('div', 'agd-tx-field is-select agd-tx-multi' + (cls ? ' ' + cls : ''));
      var ph = h('span', 'agd-tx-fval is-ph', L.pickPh);
      var chips = h('span', 'agd-tx-chips');
      f.appendChild(ph);
      f.appendChild(chips);
      f.appendChild(icon('txCaret', 'agd-tx-fico'));
      return { el: f, ph: ph, chips: chips };
    }
    var fs = card(L.scn);
    var fScn = chipsField();
    fs.el.appendChild(fScn.el);
    filt.appendChild(fs.el);
    var fp = card(L.plan);
    var fPlan = chipsField();
    fp.el.appendChild(fPlan.el);
    filt.appendChild(fp.el);
    var fg = card(L.group);
    function toggle() {
      var t = h('span', 'agd-tx-toggle');
      t.appendChild(h('i', 'agd-tx-switch'));
      t.appendChild(h('span', null, L.nowToggle));
      return t;
    }
    var nowToggle = toggle();
    fg.head.appendChild(nowToggle);
    var fGroup = chipsField();
    fg.el.appendChild(fGroup.el);
    filt.appendChild(fg.el);

    var calCol = h('div', 'agd-tx-col agd-tx-calcol');
    var range = h('div', 'agd-tx-card agd-tx-range2');
    range.appendChild(field(L.start, cal.from || '', null, 'txCal').el);
    range.appendChild(field(L.end, cal.to || '', null, 'txCal').el);
    calCol.appendChild(range);
    var cCal = card(L.schedule, 'agd-tx-calcard');
    // 좁은 화면: 왼쪽 거르기 대신 고른 값 한 줄 + 즉시 실행 포함
    var fline = h('div', 'agd-tx-fline');
    var flineChips = h('span', 'agd-tx-chips');
    fline.appendChild(flineChips);
    var nowToggle2 = toggle();
    fline.appendChild(nowToggle2);
    cCal.el.appendChild(fline);
    var tool = h('div', 'agd-tx-caltool');
    tool.appendChild(btn(L.today, 'is-outline'));
    tool.appendChild(field('', L.projPick, 'is-select is-ph agd-tx-small agd-tx-projpick', 'txCaret').el);
    var nav = h('span', 'agd-tx-calnav');
    nav.appendChild(icon('txLeft'));
    nav.appendChild(h('span', 'agd-tx-month', cal.y + '년 ' + cal.m + '월'));
    nav.appendChild(icon('txRight'));
    tool.appendChild(nav);
    var views = h('span', 'agd-tx-views');
    ['txGrid', 'txRows', 'txList', 'txDensity'].forEach(function (nm, i) {
      views.appendChild(icon(nm, 'agd-tx-viewbtn' + (i === 0 ? ' is-on' : '')));
    });
    tool.appendChild(views);
    cCal.el.appendChild(tool);
    var grid = h('div', 'agd-tx-calgrid');
    L.week.forEach(function (d) {
      grid.appendChild(h('span', 'agd-tx-wday', d));
    });
    var first = new Date(cal.y, cal.m - 1, 1).getDay();
    var days = new Date(cal.y, cal.m, 0).getDate();
    var prevDays = new Date(cal.y, cal.m - 1, 0).getDate();
    var cellsN = Math.ceil((first + days) / 7) * 7;
    var dayEv = {};
    for (var ci = 0; ci < cellsN; ci++) {
      var d = ci - first + 1;
      var out = d < 1 || d > days;
      var num = d < 1 ? prevDays + d : d > days ? d - days : d;
      var cell = h('div', 'agd-tx-cell' + (out ? ' is-out' : '') + (!out && d === cal.today ? ' is-today' : ''));
      cell.appendChild(h('span', 'agd-tx-day', num + '일'));
      var ev = h('div', 'agd-tx-evs');
      cell.appendChild(ev);
      grid.appendChild(cell);
      if (!out) dayEv[d] = ev;
    }
    cCal.el.appendChild(grid);
    calCol.appendChild(cCal.el);
    pCal.appendChild(filt);
    pCal.appendChild(calCol);

    var planColors = app.planColors || [];
    var events = (cal.events || []).map(function (e) {
      var chip = h('span', 'agd-tx-ev agd-tx-hide' + (e.kind === 'now' ? ' is-now' : ''));
      if (e.kind !== 'now') chip.style.setProperty('--ev', planColors[e.plan] || '#5b5fe6');
      if (e.time) chip.appendChild(h('b', null, e.time));
      chip.appendChild(h('span', null, e.label));
      if (dayEv[e.day]) dayEv[e.day].appendChild(chip);
      return { def: e, el: chip };
    });

    /* ---- ④ Runs */
    var pRuns = page('runs');
    var cRuns = card(L.runs, 'agd-tx-runs');
    var rf = h('div', 'agd-tx-rfilter');
    rf.appendChild(field('', L.project, 'is-select is-ph agd-tx-small', 'txCaret').el);
    rf.appendChild(field('', L.kind, 'is-select is-ph agd-tx-small', 'txCaret').el);
    rf.appendChild(h('span', 'agd-tx-rgap'));
    rf.appendChild(field(L.start, (app.runsRange || [])[0] || '', 'agd-tx-small agd-tx-date', 'txCal').el);
    rf.appendChild(field(L.end, (app.runsRange || [])[1] || '', 'agd-tx-small agd-tx-date', 'txCal').el);
    cRuns.el.appendChild(rf);
    var tools = h('div', 'agd-tx-tools');
    L.tools.forEach(function (t) {
      var s = h('span', 'agd-tx-tool');
      s.appendChild(icon(t[0]));
      s.appendChild(h('span', null, t[1]));
      tools.appendChild(s);
    });
    cRuns.el.appendChild(tools);
    var runTable = h('div', 'agd-tx-table agd-tx-t-runs');
    runTable.appendChild(tr('is-head', L.runCols));
    function runRow(r) {
      var name = h('span', 'agd-tx-td agd-tx-rname', r.name);
      var kind = h('span', 'agd-tx-td agd-tx-rkind', r.kind);
      var st = h('span', 'agd-tx-td agd-tx-rstart', r.start);
      var en = h('span', 'agd-tx-td agd-tx-rend', r.end || '');
      var pc = h('span', 'agd-tx-td agd-tx-rprog');
      var bar = h('span', 'agd-tx-pbar');
      var pf = h('i', 'agd-tx-pfill');
      var pt = h('span', 'agd-tx-ptext');
      bar.appendChild(pf);
      bar.appendChild(pt);
      pc.appendChild(bar);
      var sc = h('span', 'agd-tx-td agd-tx-rstat');
      var chip = h('span', 'agd-tx-status');
      sc.appendChild(chip);
      var res = h('span', 'agd-tx-td agd-tx-rres');
      res.appendChild(icon('txReport'));
      var row = tr(null, [name, kind, st, en, pc, sc, res]);
      function set(p, status, end) {
        pf.style.width = p + '%';
        pt.textContent = p + ' %';
        bar.className = 'agd-tx-pbar is-' + status;
        chip.className = 'agd-tx-status is-' + status;
        chip.textContent = L.status[status] || status;
        if (end !== undefined) en.textContent = end;
      }
      set(r.progress, r.status);
      return { el: row, set: set, res: res, chip: chip };
    }
    var nr = app.newRun || {};
    var newRow = runRow({ name: nr.name, kind: nr.kind, start: nr.start, end: '', progress: 0, status: 'running' });
    newRow.el.classList.add('agd-tx-hide', 'is-new');
    runTable.appendChild(newRow.el);
    (app.runs || []).forEach(function (r) {
      runTable.appendChild(runRow(r).el);
    });
    cRuns.el.appendChild(runTable);
    pRuns.appendChild(cRuns.el);

    /* ---- ⑤ 대시보드 */
    var pDash = page('dash');
    var cDash = card(L.dashTitle, 'agd-tx-dashcard');
    var tilesBox = h('div', 'agd-tx-tiles');
    var tiles = (dashData.tiles || []).map(function (t, i) {
      var tile = h('div', 'agd-tx-tile is-c' + i);
      tile.appendChild(h('p', 'agd-tx-tlabel', t.label));
      var v = h('p', 'agd-tx-tval', '0');
      tile.appendChild(v);
      var ring = null;
      var pct = null;
      if (t.of) {
        var r = 30;
        var circ = 2 * Math.PI * r;
        var s = svg('svg', { viewBox: '0 0 80 80', class: 'agd-tx-ring', 'aria-hidden': 'true' });
        s.appendChild(svg('circle', { cx: 40, cy: 40, r: r, class: 'agd-tx-ringbg' }));
        ring = svg('circle', { cx: 40, cy: 40, r: r, class: 'agd-tx-ringfg', 'stroke-dasharray': '0 ' + circ, transform: 'rotate(-90 40 40)' });
        s.appendChild(ring);
        var wrap = h('div', 'agd-tx-ringwrap');
        wrap.appendChild(s);
        pct = h('span', 'agd-tx-pct', '0%');
        wrap.appendChild(pct);
        tile.appendChild(wrap);
        ring.circ = circ;
      }
      tilesBox.appendChild(tile);
      return { def: t, val: v, ring: ring, pct: pct };
    });
    cDash.el.appendChild(tilesBox);
    pDash.appendChild(cDash.el);

    var chartsBox = h('div', 'agd-tx-charts');
    function chart(title, data, cls) {
      var c = card(title, 'agd-tx-chart' + (cls ? ' ' + cls : ''));
      var plot = h('div', 'agd-tx-plot');
      var axis = h('div', 'agd-tx-yaxis');
      var lines = h('div', 'agd-tx-grid');
      for (var k = 4; k >= 0; k--) {
        axis.appendChild(h('span', null, String(Math.round((data.max / 4) * k))));
        lines.appendChild(h('i'));
      }
      plot.appendChild(axis);
      var area = h('div', 'agd-tx-bars');
      area.appendChild(lines);
      var cols = data.months.map(function (mo, i) {
        var col = h('div', 'agd-tx-barcol');
        var stack = h('div', 'agd-tx-stack');
        var segs = ['s', 'f', 'c', 'r'].map(function (key) {
          var v = (data[key] || [])[i] || 0;
          var seg = h('span', 'agd-tx-seg is-' + key);
          if (v / data.max >= 0.14) seg.appendChild(h('b', null, String(v)));
          stack.appendChild(seg);
          return { el: seg, v: v };
        });
        col.appendChild(stack);
        col.appendChild(h('span', 'agd-tx-xlab', mo));
        area.appendChild(col);
        return segs;
      });
      plot.appendChild(area);
      c.el.appendChild(plot);
      var lg = h('div', 'agd-tx-legend');
      L.legend.forEach(function (l) {
        var s = h('span', 'agd-tx-lg is-' + l[0]);
        s.appendChild(h('i'));
        s.appendChild(h('span', null, l[1]));
        lg.appendChild(s);
      });
      c.el.appendChild(lg);
      chartsBox.appendChild(c.el);
      return { cols: cols, max: data.max };
    }
    var charts = [];
    if (dashData.count) charts.push(chart(L.chartCount, dashData.count));
    if (dashData.minutes) charts.push(chart(L.chartMin, dashData.minutes, 'is-second'));
    pDash.appendChild(chartsBox);

    /* ---------------------------------------------------------------- 상태 · 그리기 */
    var state;
    function fresh() {
      return {
        page: 'scen', picked: null, reqShown: 0, name: '', typing: false,
        users: 1, duration: 1, ramp: 0, tp: '', saved: false, group: false,
        running: false, filters: false, now: false, newRun: null, dash: 0
      };
    }

    function show(el, on) {
      el.classList.toggle('agd-tx-hide', !on);
    }

    function render() {
      Object.keys(pages).forEach(function (k) {
        pages[k].classList.toggle('is-on', state.page === k);
      });
      subAll.classList.toggle('is-on', state.page === 'dash');
      subSchedule.classList.toggle('is-on', state.page === 'cal');

      Object.keys(scenRows).forEach(function (k) {
        scenRows[k].classList.toggle('is-sel', String(state.picked) === k);
      });
      var picked = (app.scenarios || []).filter(function (s) { return s.id === state.picked; })[0];
      scnField.val.textContent = picked ? picked.name : '';
      reqRows.forEach(function (r, i) { show(r, i < state.reqShown); });

      nameField.val.textContent = state.name;
      caret.classList.toggle('is-on', state.typing);
      nameField.el.classList.toggle('is-focus', state.typing);
      sliders.users.set(state.users);
      sliders.duration.set(state.duration);
      sliders.ramp.set(state.ramp);
      tpField.val.textContent = state.tp;
      show(pinfoRow, state.saved);
      show(pinfoEmpty, !state.saved);
      show(groupRow, state.group);
      show(groupEmpty, !state.group);
      runBtn.classList.toggle('is-busy', state.running);
      runBtn.querySelector('.agd-tx-btntext').textContent = state.running ? L.running : L.run;
      runsLeft.textContent = String(credits.runs - (state.running ? 1 : 0));
      minLeft.textContent = String(credits.minutes - (state.running ? plan.duration || 0 : 0));

      [[fScn, app.filters && app.filters.scenarios], [fPlan, app.filters && app.filters.plans], [fGroup, app.filters && app.filters.groups]].forEach(function (pair) {
        var f = pair[0];
        f.chips.textContent = '';
        show(f.ph, !state.filters);
        if (!state.filters) return;
        (pair[1] || []).forEach(function (c) {
          var chip = h('span', 'agd-tx-chip');
          if (c.plan !== undefined) {
            var dot = h('i', 'agd-tx-dot');
            dot.style.background = planColors[c.plan];
            chip.appendChild(dot);
          }
          chip.appendChild(h('span', null, c.label));
          f.chips.appendChild(chip);
        });
      });
      flineChips.textContent = '';
      if (state.filters) {
        ((app.filters && app.filters.plans) || []).forEach(function (c) {
          var chip = h('span', 'agd-tx-chip');
          var dot = h('i', 'agd-tx-dot');
          dot.style.background = planColors[c.plan];
          chip.appendChild(dot);
          chip.appendChild(h('span', null, c.short || c.label));
          flineChips.appendChild(chip);
        });
      }
      nowToggle.classList.toggle('is-on', state.now);
      nowToggle2.classList.toggle('is-on', state.now);
      events.forEach(function (e) {
        var on = state.filters && (e.def.kind === 'now' ? state.now && state.running : !e.def.needsGroup || state.group);
        show(e.el, on);
      });

      show(newRow.el, !!state.newRun);
      if (state.newRun) newRow.set(state.newRun.progress, state.newRun.status, state.newRun.end);

      var f = state.dash;
      tiles.forEach(function (t) {
        var v = Math.round(t.def.value * f);
        t.val.textContent = String(v);
        if (t.ring) {
          var p = t.def.of ? (t.def.value / t.def.of) * f : 0;
          t.ring.setAttribute('stroke-dasharray', (t.ring.circ * p).toFixed(1) + ' ' + t.ring.circ.toFixed(1));
          t.pct.textContent = (p * 100).toFixed(1) + '%';
        }
      });
      charts.forEach(function (c) {
        c.cols.forEach(function (segs) {
          segs.forEach(function (s) {
            s.el.style.height = ((s.v / c.max) * 100 * f).toFixed(2) + '%';
          });
        });
      });
    }

    function reset() {
      state = fresh();
      // 취소된 회차가 남긴 말풍선 · 화면 전환 효과를 지운다
      Object.keys(sliderEls).forEach(function (k) { sliderEls[k].classList.remove('is-active'); });
      render();
      body.scrollTop = 0;
    }

    /* 본문 안에서만 부드럽게 스크롤(ctx.sleep 단계 — 일시정지 · 취소를 따른다) */
    function offsetIn(el) {
      return el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    }
    function glideTo(top, ctx, ms) {
      var from = body.scrollTop;
      var to = Math.max(0, Math.min(top, body.scrollHeight - body.clientHeight));
      if (ctx.instant || Math.abs(to - from) < 2) {
        body.scrollTop = to;
        return Promise.resolve();
      }
      var steps = 9;
      var i = 0;
      function next() {
        i += 1;
        var t = 1 - Math.pow(1 - i / steps, 3);
        body.scrollTop = Math.round(from + (to - from) * t);
        return i >= steps ? null : ctx.sleep((ms || 420) / steps).then(next);
      }
      return next();
    }
    /* el이 본문 안에 다 보이게(위쪽 여유 12px) — 이미 보이면 그대로 */
    function glideInto(el, ctx, ms) {
      if (!el || el.offsetParent === null) return Promise.resolve();
      var top = offsetIn(el);
      var bottom = top + el.offsetHeight;
      var view = body.scrollTop;
      if (top >= view + 8 && bottom <= view + body.clientHeight - 8) return Promise.resolve();
      var to = bottom - top > body.clientHeight - 24 || top < view ? top - 12 : bottom - body.clientHeight + 16;
      return glideTo(to, ctx, ms);
    }

    function animate(ms, ctx, fn) {
      if (ctx.instant) {
        fn(1);
        return Promise.resolve();
      }
      var steps = Math.max(4, Math.round(ms / 60));
      var i = 0;
      function next() {
        i += 1;
        fn(i / steps);
        return i >= steps ? null : ctx.sleep(ms / steps).then(next);
      }
      return next();
    }

    function goPage(id) {
      state.page = id;
      render();
      body.scrollTop = 0;
      var p = pages[id];
      p.classList.remove('is-enter');
      void p.offsetWidth;
      p.classList.add('is-enter');
    }

    var sliderEls = { users: sliders.users.el, duration: sliders.duration.el, ramp: sliders.ramp.el };

    var actions = {
      /* 시나리오 행을 고른다 → 시나리오 · 플랜 화면, 요청 목록이 차례로 */
      pick: function (a, ctx) {
        state.picked = a.id;
        render();
        var total = reqRows.length;
        if (ctx.instant) {
          goPage('plan');
          state.reqShown = total;
          render();
          return null;
        }
        return ctx.sleep(380).then(function () {
          goPage('plan');
          var i = 0;
          function add() {
            if (i >= total) return null;
            i += 1;
            state.reqShown = i;
            render();
            return ctx.sleep(a.stagger || 200).then(add);
          }
          return ctx.sleep(260).then(add);
        });
      },

      /* 플랜 명 입력 */
      type: function (a, ctx) {
        var text = String(a.text || '');
        if (ctx.instant) {
          state.name = text;
          state.typing = false;
          render();
          return null;
        }
        state.typing = true;
        var i = 0;
        function next() {
          if (i >= text.length) {
            state.typing = false;
            render();
            return null;
          }
          i += 1;
          state.name = text.slice(0, i);
          render();
          return ctx.sleep(a.every || 60).then(next);
        }
        return next();
      },

      /* 슬라이더 — 본문에서 그 줄을 보이게 한 뒤 값이 움직인다 */
      slide: function (a, ctx) {
        var key = a.field;
        var from = state[key];
        var to = a.to;
        return glideInto(sliderEls[key], ctx, 360).then(function () {
          if (!ctx.instant) sliderEls[key].classList.add('is-active');
          return animate(a.ms || 800, ctx, function (t) {
            var e = 1 - Math.pow(1 - t, 3);
            state[key] = Math.round(from + (to - from) * e);
            render();
          });
        }).then(function () {
          // 값 말풍선은 움직이는 동안만(MUI valueLabelDisplay 'auto') — 이름표와 겹치지 않게
          return ctx.instant ? null : ctx.sleep(260);
        }).then(function () {
          sliderEls[key].classList.remove('is-active');
        });
      },

      /* Advanced Option — Target Throughput */
      throughput: function (a, ctx) {
        return glideInto(adv, ctx, 420).then(function () {
          if (ctx.instant) {
            state.tp = String(a.value);
            render();
            return null;
          }
          return ctx.sleep(300).then(function () {
            state.tp = String(a.value);
            render();
          });
        });
      },

      /* 커서 목표가 보이게 본문을 미리 움직인다 */
      glide: function (a, ctx) {
        var el = target(a.to, true);
        return glideInto(el, ctx, a.ms || 420);
      },

      save: function (a, ctx) {
        state.saved = true;
        render();
        return glideInto(pinfoRow, ctx, 380);
      },

      group: function (a, ctx) {
        state.group = true;
        render();
        return glideInto(groupRow, ctx, 300);
      },

      run: function (a, ctx) {
        state.running = true;
        render();
        if (!ctx.instant) U.toast(screen, a.toast || '테스트를 시작했습니다.', { tone: 'info', ms: 1800 }, ctx);
        return null;
      },

      page: function (a) {
        goPage(a.to);
        return null;
      },

      /* 캘린더 거르기(시나리오 · 플랜 · 스케줄 그룹) — 고르면 플랜 색으로 일정이 뜬다 */
      filters: function (a, ctx) {
        if (ctx.instant) {
          state.filters = true;
          render();
          return null;
        }
        return ctx.sleep(a.delay || 420).then(function () {
          state.filters = true;
          render();
        });
      },

      toggleNow: function () {
        state.now = true;
        render();
        return null;
      },

      /* 실행 목록 — 맨 위에 방금 실행이 붙고 진행률이 차면 Complete */
      progress: function (a, ctx) {
        var nr2 = app.newRun || {};
        state.newRun = { progress: 0, status: 'running', end: '' };
        render();
        return animate(a.ms || 2400, ctx, function (t) {
          state.newRun.progress = Math.round(t * 100);
          if (t >= 1) {
            state.newRun.status = 'complete';
            state.newRun.end = nr2.end || '';
          }
          render();
        });
      },

      /* 대시보드 — 수치와 막대가 차오른다 */
      dash: function (a, ctx) {
        return animate(a.ms || 1400, ctx, function (t) {
          state.dash = 1 - Math.pow(1 - t, 2);
          render();
        }).then(function () {
          return ctx.instant ? null : ctx.sleep(700);
        }).then(function () {
          return glideInto(chartsBox, ctx, 600);
        });
      }
    };

    /* 커서 목표 — 보이지 않으면 null(엔진이 그 커서 장면을 건너뛴다) */
    function target(key, noReveal) {
      var parts = String(key).split(':');
      var el = null;
      if (parts[0] === 'row') el = scenRows[parts[1]] ? scenRows[parts[1]].children[1] : null;
      else if (key === 'field:planName') el = nameField.el;
      else if (key === 'save') el = saveBtn;
      else if (key === 'group-add') el = groupAdd;
      else if (key === 'run') el = runBtn;
      else if (key === 'subtab:all') el = subAll;
      else if (key === 'subtab:schedule') el = subSchedule;
      else if (key === 'toggle:now') el = nowToggle.offsetParent !== null ? nowToggle : nowToggle2;
      else if (key === 'result:new') el = newRow.res.offsetParent !== null ? newRow.res : newRow.chip;
      if (!el || el.offsetParent === null) return null;
      if (!noReveal && body.contains(el)) U.reveal(body, el);
      return el;
    }

    reset();
    return { reset: reset, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('txhub-portal', { mount: mount });
})(window, document);
