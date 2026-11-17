/*
 * 구축 사례 시연 엔진 (설계 0001 §3-3 · §4-2)
 *
 * 렌더러(화면 유형)와 시나리오(각본)를 등록받아 [data-agent-demo] 영역에 탭 · 가짜 앱 창 · 컨트롤을 붙인다.
 *   AgentDemo.registerRenderer(type, { mount(screenEl, scenario) → { reset(), target(key), actions } })
 *   AgentDemo.registerScenario({ id, order, renderer, tab, summary, points, app, script, hold })
 *
 * 지키는 것:
 *   - 전역은 window.AgentDemo 하나(P: 기존 전역 wW · wH · gap · anchorList … 와 겹치지 않음)
 *   - window.resize · 페이지 스크롤을 건드리지 않는다(P5) — 폭은 ResizeObserver로 영역만 본다
 */
(function (window, document) {
  'use strict';

  var VERSION = '20261117-14';
  var CANCEL = { cancelled: true };
  var VISIBLE_RATIO = 0.35;
  var START_DELAY = 400; // 이만큼 계속 보여야 첫 재생 — 앵커 이동 스크롤이 지나가는 순간에는 시작하지 않는다
  var CURSOR_MS = 750;
  var CLICK_MS = 260;
  var DEFAULT_HOLD = 4000;
  // 영역 폭이 이 값 이상이면 왼쪽 세로 목록 + 오른쪽 시연 화면, 미만이면 위쪽 가로 탭(설계 0004 §3-1)
  var SIDE_MIN = 1000;
  // 영역 폭 → 배치(§3-4)
  var SIZES = [
    { name: 'lg', min: 1000 },
    { name: 'md', min: 700 },
    { name: 'sm', min: 0 }
  ];
  var TEXT = {
    pause: '일시정지',
    play: '재생',
    restart: '처음부터',
    theaterOpen: '크게 보기',
    theaterClose: '작게 보기',
    theaterLabel: '구축 사례 크게 보기'
  };

  var renderers = {};
  var scenarios = [];
  var projects = [];
  var demos = [];
  // 프로젝트 없는 사례가 들어갈 이름 없는 묶음(설계 0002 §4-2)
  var LOOSE = { id: '_loose', order: 1e9, client: '', name: '' };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }

  function warn(msg) {
    if (window.console && console.warn) console.warn('[AgentDemo] ' + msg);
  }

  function registerRenderer(type, impl) {
    renderers[type] = impl;
  }

  function projectOf(sc) {
    for (var i = 0; i < projects.length; i++) if (projects[i].id === sc.project) return projects[i];
    return LOOSE;
  }

  /* 프로젝트 순서 → 사례 순서 */
  function sortScenarios() {
    scenarios.sort(function (a, b) {
      return (projectOf(a).order || 0) - (projectOf(b).order || 0) || (a.order || 0) - (b.order || 0);
    });
  }

  /* 사례가 있는 프로젝트만, 사례 순서대로 */
  function projectGroups() {
    var out = [];
    scenarios.forEach(function (sc) {
      var p = projectOf(sc);
      if (out.indexOf(p) < 0) out.push(p);
    });
    return out;
  }

  function registerProject(project) {
    if (!project || !project.id) return warn('id 없는 프로젝트는 등록하지 않습니다.');
    projects = projects.filter(function (p) { return p.id !== project.id; });
    projects.push(project);
    sortScenarios();
    demos.forEach(function (d) { d.onScenariosChanged(); });
  }

  function registerScenario(scenario) {
    if (!scenario || !scenario.id) return warn('id 없는 시나리오는 등록하지 않습니다.');
    scenarios = scenarios.filter(function (s) { return s.id !== scenario.id; });
    scenarios.push(scenario);
    sortScenarios();
    demos.forEach(function (d) { d.onScenariosChanged(); });
  }

  /* ---------------------------------------------------------------- Demo */

  function Demo(root, index) {
    this.root = root;
    this.uid = 'agd' + index;
    this.projectBar = root.querySelector('.agd-projects'); // 1단(없으면 서비스 탭 한 줄로 동작)
    this.tabs = root.querySelector('.agd-tabs'); // 2단 서비스 탭
    this.panel = root.querySelector('.agd-panel');
    this.stage = root.querySelector('.agd-stage');
    this.windowTitle = root.querySelector('.agd-window-title');
    this.screen = root.querySelector('.agd-screen');
    this.playBtn = root.querySelector('[data-agd-play]');
    this.restartBtn = root.querySelector('[data-agd-restart]');
    this.bar = root.querySelector('.agd-progress-bar');
    // 크게 보기(설계 0004 §3-2) — 플레이어(탭 · 앱 창 · 아래 막대)가 화면 전체를 덮는다
    this.player = root.querySelector('.agd-player');
    this.theaterBtn = root.querySelector('[data-agd-theater]');
    this.theaterClose = root.querySelector('[data-agd-theater-close]');
    this.theater = false;
    this.savedScroll = 0;
    this.caption = root.querySelector('.agd-caption');
    // 사례별 안내 문구가 없으면 프래그먼트에 적힌 기본 문구를 쓴다
    this.defaultCaption = this.caption ? this.caption.textContent : '';
    // 방문자 설명(설계 0002 §3-6) — 프로젝트 소개 · 서비스 설명 · 시연 순서/자막. 마크업이 없으면 건너뛴다
    this.pinfo = root.querySelector('.agd-pinfo');
    this.infoBox = root.querySelector('.agd-info');
    // 서비스 설명 · 프로젝트 소개 · 자막은 사례마다 높이가 달라 전환 때 아래 내용이 움직인다(I-028) →
    // 모든 사례(프로젝트)의 것을 같은 격자 칸에 겹쳐 두고 지금 것만 보이게 해 높이를 최댓값으로 고정한다
    this.infoTemplate = this.infoBox ? this.infoBox.cloneNode(true) : null;
    this.pinfoTemplate = this.pinfo ? this.pinfo.cloneNode(true) : null;
    this.infoItems = {};
    this.pinfoItems = {};
    this.warned = {};
    this.chapters = root.querySelector('.agd-chapters');
    this.chapterList = root.querySelector('.agd-chapter-list');
    this.chapterNow = root.querySelector('.agd-chapter-now');
    this.chapterIndex = -1;
    this.chapterStarts = [];
    this.scriptLength = 0;

    this.gen = 0; // 세대 번호 — 바뀌면 진행 중인 각본은 취소된다
    this.view = null;
    this.viewId = null;
    this.currentId = null;
    this.started = false; // 현재 시나리오를 (모션 있게) 재생 중이다
    this.userPaused = false;
    // 사용자가 고른 범위: null = 전부 차례로 · 'project' = 그 프로젝트 안에서만 · 'scenario' = 그 사례만 반복
    this.pickMode = null;
    this.renderedProject = null;
    this.visible = false;
    this.docHidden = !!document.hidden;
    this.size = null;
    this.layout = null;
    this.parked = []; // 멈춘 동안 세워 둔 대기(타이머 없이) — 재개할 때 wake()가 깨운다
    this.startTimer = null;
    this.measureQueued = false;

    this.cursor = el('span', 'agd-cursor');
    this.cursor.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M3 2l7.5 19 2.6-7.4L20.5 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    this.stage.appendChild(this.cursor);

    this.bind();
    this.measure(true);
    this.onScenariosChanged(); // 시나리오가 올라가면 select()가 is-ready를 붙인다(0개면 대체 문구 유지)
  }

  Demo.prototype.bind = function () {
    var self = this;
    this.playBtn.addEventListener('click', function () { self.togglePlay(); });
    this.restartBtn.addEventListener('click', function () {
      self.userPaused = false;
      self.play(self.currentId);
    });
    this.tabs.addEventListener('keydown', function (e) { self.onTabKey(e, self.tabs); });
    if (this.theaterBtn) {
      this.theaterBtn.addEventListener('click', function () {
        if (self.theater) self.closeTheater();
        else self.openTheater();
      });
    }
    if (this.theaterClose) this.theaterClose.addEventListener('click', function () { self.closeTheater(); });
    document.addEventListener('keydown', function (e) {
      if (!self.theater) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        self.closeTheater();
      } else if (e.key === 'Tab') {
        self.trapTab(e);
      }
    });
    if (this.projectBar) this.projectBar.addEventListener('keydown', function (e) { self.onTabKey(e, self.projectBar); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          self.visible = entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO;
        });
        self.onVisibility();
      }, { threshold: [0, VISIBLE_RATIO, 0.6, 1] }).observe(this.stage);
    } else {
      this.visible = true;
    }
    document.addEventListener('visibilitychange', function () {
      self.docHidden = !!document.hidden;
      self.onVisibility(); // 시작 지연 중에 탭이 숨었다 돌아온 경우에도 재생을 시작한다(syncControls 포함)
    });
    if ('ResizeObserver' in window) {
      // 크기 판정은 앱 창 폭 기준(크게 보기에서 창이 넓어지면 그 폭에 맞게 · 설계 0004)
      var ro = new ResizeObserver(function () { self.measure(); });
      ro.observe(this.root);
      ro.observe(this.stage);
    } else {
      // 폭만 읽는다 — 스크롤 위치는 건드리지 않는다(P5)
      window.addEventListener('resize', function () { self.measure(); });
    }
  };

  /* 영역 폭 → data-size. 관찰 콜백 안에서 바로 바꾸면 같은 프레임에 높이가 바뀌어
     "ResizeObserver loop …" 오류 이벤트가 나므로 다음 프레임으로 미룬다(처음 한 번만 즉시) */
  Demo.prototype.measure = function (now) {
    var self = this;
    function apply() {
      self.measureQueued = false;
      // 배치(왼쪽 목록 / 위쪽 탭)는 영역 폭으로, 화면 유형 배치(lg/md/sm)는 앱 창 폭으로
      var layout = self.root.clientWidth >= SIDE_MIN ? 'side' : 'top';
      if (layout !== self.layout) {
        self.layout = layout;
        self.root.setAttribute('data-layout', layout);
        var orient = layout === 'side' ? 'vertical' : 'horizontal';
        self.tabs.setAttribute('aria-orientation', orient);
        if (self.projectBar) self.projectBar.setAttribute('aria-orientation', orient);
      }
      var w = self.stage.clientWidth || self.root.clientWidth;
      var size = SIZES[SIZES.length - 1].name;
      for (var i = 0; i < SIZES.length; i++) {
        if (w >= SIZES[i].min) { size = SIZES[i].name; break; }
      }
      if (size !== self.size) {
        self.size = size;
        self.root.setAttribute('data-size', size);
      }
    }
    if (now) return apply();
    if (this.measureQueued) return;
    this.measureQueued = true;
    (window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); })(apply);
  };

  Demo.prototype.scenario = function (id) {
    for (var i = 0; i < scenarios.length; i++) if (scenarios[i].id === id) return scenarios[i];
    return null;
  };

  /* 시나리오 등록이 바뀌면 탭을 다시 그린다. 처음이면 첫 시나리오를 고른다 */
  Demo.prototype.onScenariosChanged = function () {
    this.buildStacks();
    this.renderTabs();
    if (!this.currentId && scenarios.length > 0) {
      this.select(scenarios[0].id);
      if (reduceMotion) this.renderFinal(this.currentId);
      this.onVisibility();
    }
  };

  /* 지금 보여 줄 프로젝트 — 현재 사례의 프로젝트, 없으면 첫 프로젝트 */
  Demo.prototype.activeProject = function () {
    var cur = this.scenario(this.currentId);
    if (cur) return projectOf(cur);
    return scenarios.length ? projectOf(scenarios[0]) : null;
  };

  Demo.prototype.tabButton = function (cls, id, attr, controls) {
    var b = el('button', cls);
    b.type = 'button';
    b.id = id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', controls);
    b.setAttribute(attr[0], attr[1]);
    return b;
  };

  /* 1단 프로젝트 탭 + 2단 서비스 탭(설계 0002 §3-5). 서비스가 1개인 프로젝트는 2단을 숨긴다 */
  Demo.prototype.renderTabs = function () {
    var self = this;
    var active = this.activeProject();
    // 다시 그리기 전에 프로젝트 줄에 포커스가 있었으면 뒤에 선택 탭으로 되돌린다(I-029)
    var hadFocus = !!this.projectBar && this.projectBar.contains(document.activeElement);
    scenarios.forEach(function (sc) {
      if (sc.project && projectOf(sc) === LOOSE && !self.warned[sc.id]) {
        self.warned[sc.id] = true;
        warn('사례 "' + sc.id + '"의 프로젝트 "' + sc.project + '"가 등록되지 않았습니다(projects.js).');
      }
    });
    this.panel.id = this.uid + '-panel';
    this.tabs.id = this.uid + '-services';

    if (this.projectBar) {
      this.projectBar.textContent = '';
      projectGroups().forEach(function (p) {
        var b = self.tabButton('agd-ptab', self.uid + '-project-' + p.id, ['data-pid', p.id], self.tabs.id);
        if (p.client) b.appendChild(el('span', 'agd-ptab-client', p.client));
        if (p.name) b.appendChild(el('span', 'agd-ptab-name', p.name));
        if (!p.client && !p.name) b.appendChild(el('span', 'agd-ptab-name', '기타'));
        b.addEventListener('click', function () { self.pickProject(p.id); });
        self.projectBar.appendChild(b);
      });
      this.projectBar.classList.toggle('is-hidden', scenarios.length === 0);
    }
    this.syncInfo();

    this.tabs.textContent = '';
    var list = this.projectBar && active
      ? scenarios.filter(function (sc) { return projectOf(sc) === active; })
      : scenarios;
    list.forEach(function (sc) {
      var b = self.tabButton('agd-tab', self.uid + '-tab-' + sc.id, ['data-id', sc.id], self.panel.id);
      b.appendChild(el('span', 'agd-tab-title', sc.tab && sc.tab.title ? sc.tab.title : sc.id));
      b.addEventListener('click', function () { self.pick(sc.id); });
      self.tabs.appendChild(b);
    });
    // 서비스가 1개여도 2단 탭을 보여 준다 — 무슨 서비스인지 알리고 프로젝트마다 구성을 같게(I-034)
    this.tabs.classList.toggle('is-hidden', list.length === 0);
    this.renderedProject = active ? active.id : null;
    this.syncTabs();
    if (hadFocus) {
      var sel = this.projectBar.querySelector('.agd-ptab[aria-selected="true"]');
      if (sel && sel.focus) sel.focus({ preventScroll: true });
    }
  };

  Demo.prototype.syncTabs = function () {
    var id = this.currentId;
    var active = this.activeProject();
    var buttons = this.tabs.querySelectorAll('.agd-tab');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-id') === id;
      buttons[i].setAttribute('aria-selected', on ? 'true' : 'false');
      buttons[i].tabIndex = on ? 0 : -1;
      if (on) {
        this.panel.setAttribute('aria-labelledby', buttons[i].id);
        this.followTab(this.tabs, buttons[i]);
      }
    }
    if (!this.projectBar) return;
    var pbuttons = this.projectBar.querySelectorAll('.agd-ptab');
    for (var j = 0; j < pbuttons.length; j++) {
      var pon = !!active && pbuttons[j].getAttribute('data-pid') === active.id;
      pbuttons[j].setAttribute('aria-selected', pon ? 'true' : 'false');
      pbuttons[j].tabIndex = pon ? 0 : -1;
      if (pon) {
        this.tabs.setAttribute('aria-labelledby', pbuttons[j].id);
        this.followTab(this.projectBar, pbuttons[j]);
      }
    }
  };

  /* 탭 줄이 넘치면(좁은 화면) 선택된 탭이 보이게 그 줄만 가로로 민다 — 페이지는 스크롤하지 않는다 */
  Demo.prototype.followTab = function (bar, button) {
    if (bar.scrollWidth <= bar.clientWidth + 1) return;
    var left = button.offsetLeft - bar.offsetLeft;
    var right = left + button.offsetWidth;
    if (left < bar.scrollLeft) bar.scrollLeft = Math.max(0, left - 8);
    else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = right - bar.clientWidth + 8;
  };

  Demo.prototype.onTabKey = function (e, bar) {
    // 가로 탭은 ← →, 세로 목록은 ↑ ↓(둘 다 받아도 해가 없다)
    var keys = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1, Home: 'first', End: 'last' };
    if (!(e.key in keys)) return;
    var buttons = Array.prototype.slice.call(bar.querySelectorAll('[role="tab"]'));
    if (buttons.length === 0) return;
    var at = buttons.indexOf(document.activeElement);
    var k = keys[e.key];
    var next = k === 'first' ? 0 : k === 'last' ? buttons.length - 1 : (at + k + buttons.length) % buttons.length;
    e.preventDefault();
    buttons[next].focus();
    var pid = buttons[next].getAttribute('data-pid');
    if (pid) this.pickProject(pid);
    else this.pick(buttons[next].getAttribute('data-id'));
  };

  /* 사용자가 서비스 탭을 골랐다 → 그 사례만 반복 */
  Demo.prototype.pick = function (id) {
    this.pickMode = 'scenario';
    this.startPicked(id);
  };

  /* 사용자가 프로젝트 탭을 골랐다 → 그 프로젝트의 첫 사례부터, 그 프로젝트 안에서만 */
  Demo.prototype.pickProject = function (pid) {
    var first = null;
    for (var i = 0; i < scenarios.length; i++) {
      if (projectOf(scenarios[i]).id === pid) { first = scenarios[i]; break; }
    }
    if (!first) return;
    this.pickMode = 'project';
    this.startPicked(first.id);
  };

  Demo.prototype.startPicked = function (id) {
    this.userPaused = false;
    this.select(id);
    if (reduceMotion && !this.started) this.renderFinal(id);
    else this.play(id);
  };

  /* ------------------------------------------------------- 방문자 설명(설계 0002 §3-6) */

  /* 겹침 묶음 — 사례마다 서비스 설명, 프로젝트마다 소개, 모든 장의 자막 크기 잡이를 같은 칸에 만든다 */
  Demo.prototype.buildStacks = function () {
    var self = this;
    var i;
    if (this.infoBox && this.infoTemplate) {
      this.infoBox.textContent = '';
      this.infoItems = {};
      scenarios.forEach(function (sc) {
        var item = el('div', 'agd-info-item');
        for (var c = self.infoTemplate.firstChild; c; c = c.nextSibling) item.appendChild(c.cloneNode(true));
        self.fillServiceInfo(item, sc);
        self.infoBox.appendChild(item);
        self.infoItems[sc.id] = item;
      });
    }
    if (this.pinfo && this.pinfoTemplate) {
      this.pinfo.textContent = '';
      this.pinfoItems = {};
      var any = false;
      projectGroups().forEach(function (pg) {
        var item = el('div', 'agd-pinfo-item');
        for (var c = self.pinfoTemplate.firstChild; c; c = c.nextSibling) item.appendChild(c.cloneNode(true));
        var text = item.querySelector('.agd-pinfo-text');
        var badges = item.querySelector('.agd-pinfo-badges');
        var list = pg.badges || [];
        if (text) text.textContent = pg.summary || '';
        if (badges) {
          badges.textContent = '';
          for (var b = 0; b < list.length; b++) badges.appendChild(el('li', null, list[b]));
        }
        if (pg.summary || list.length) any = true;
        self.pinfo.appendChild(item);
        self.pinfoItems[pg.id] = item;
      });
      this.pinfo.classList.toggle('is-hidden', !any);
    }
    // 자막 줄: 지금 줄(aria-live) + 모든 사례의 장 자막 크기 잡이(보이지 않음 · 낭독 제외)
    if (this.chapterNow) {
      this.chapterNow.textContent = '';
      this.chapterLive = el('span', 'agd-ch-line agd-ch-live');
      this.chapterLive.setAttribute('aria-live', 'polite');
      this.chapterNow.appendChild(this.chapterLive);
      scenarios.forEach(function (sc) {
        var chs = sc.chapters || [];
        for (i = 0; i < chs.length; i++) {
          var sizer = self.chapterLine(chs, i, 'agd-ch-line agd-ch-sizer');
          sizer.setAttribute('aria-hidden', 'true');
          self.chapterNow.appendChild(sizer);
        }
      });
    }
  };

  Demo.prototype.chapterLine = function (list, i, cls) {
    var line = el('span', cls);
    line.appendChild(el('span', 'agd-ch-step', i + 1 + '/' + list.length));
    line.appendChild(el('strong', 'agd-ch-now-title', list[i].title));
    line.appendChild(el('span', 'agd-ch-caption', list[i].caption || ''));
    return line;
  };

  /* 지금 사례 · 프로젝트의 설명만 보이게(나머지는 자리만 차지 · 낭독 제외) */
  Demo.prototype.syncInfo = function () {
    var id = this.currentId;
    var active = this.activeProject();
    for (var k in this.infoItems) {
      if (!Object.prototype.hasOwnProperty.call(this.infoItems, k)) continue;
      var on = k === id;
      this.infoItems[k].classList.toggle('is-active', on);
      this.infoItems[k].setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    for (var pk in this.pinfoItems) {
      if (!Object.prototype.hasOwnProperty.call(this.pinfoItems, pk)) continue;
      var pon = !!active && pk === active.id;
      this.pinfoItems[pk].classList.toggle('is-active', pon);
      this.pinfoItems[pk].setAttribute('aria-hidden', pon ? 'false' : 'true');
    }
  };

  /* 사례 하나의 서비스 요약 + 업무 과제 · AI 에이전트의 해결 · 핵심 기능. 핵심 기능이 있으면 해시태그는 숨긴다 */
  Demo.prototype.fillServiceInfo = function (box, sc) {
    var i;
    var summary = box.querySelector('.agd-summary');
    var points = box.querySelector('.agd-points');
    var brief = box.querySelector('.agd-brief');
    var feats = sc.features || [];
    var pts = sc.points || [];
    if (summary) summary.textContent = sc.summary || '';
    if (points) {
      points.textContent = '';
      for (i = 0; i < pts.length; i++) points.appendChild(el('li', null, pts[i]));
      points.classList.toggle('is-hidden', feats.length > 0 || pts.length === 0);
    }
    if (!brief) return;
    var intro = sc.intro || {};
    var fields = [['.agd-brief-problem', intro.problem], ['.agd-brief-solution', intro.solution]];
    for (i = 0; i < fields.length; i++) {
      var node = brief.querySelector(fields[i][0]);
      if (!node) continue;
      node.textContent = fields[i][1] || '';
      if (node.parentNode) node.parentNode.classList.toggle('is-hidden', !fields[i][1]);
    }
    var textBox = brief.querySelector('.agd-brief-text');
    if (textBox) textBox.classList.toggle('is-hidden', !intro.problem && !intro.solution);
    var list = brief.querySelector('.agd-feature-list');
    if (list) {
      list.textContent = '';
      for (i = 0; i < feats.length; i++) {
        var li = el('li', 'agd-feature');
        li.appendChild(el('strong', 'agd-feature-title', feats[i].title));
        if (feats[i].desc) li.appendChild(el('span', 'agd-feature-desc', feats[i].desc));
        list.appendChild(li);
      }
    }
    var featBox = brief.querySelector('.agd-features');
    if (featBox) featBox.classList.toggle('is-hidden', feats.length === 0);
    brief.classList.toggle('is-hidden', !intro.problem && !intro.solution && feats.length === 0);
  };

  /* 시연 순서 — 장마다 진행 막대 + 제목. 지금 장의 설명은 자막 줄(aria-live)에 */
  Demo.prototype.renderChapters = function (sc) {
    if (!this.chapters || !this.chapterList) return;
    var list = sc.chapters || [];
    // 장 없는 사례면 장 있는 다른 사례의 목록을 보이지 않게 채워 높이를 유지한다(I-033)
    var holder = null;
    if (list.length === 0) {
      for (var h = 0; h < scenarios.length && !holder; h++) {
        if ((scenarios[h].chapters || []).length) holder = scenarios[h].chapters;
      }
    }
    var draw = list.length ? list : holder || [];
    this.chapterList.textContent = '';
    for (var i = 0; i < draw.length; i++) {
      var li = el('li', 'agd-ch');
      var bar = el('span', 'agd-ch-bar');
      bar.appendChild(el('i', 'agd-ch-fill'));
      li.appendChild(bar);
      var title = el('span', 'agd-ch-title');
      title.appendChild(el('span', 'agd-ch-no', String(i + 1)));
      title.appendChild(document.createTextNode(draw[i].title));
      li.appendChild(title);
      this.chapterList.appendChild(li);
    }
    // 장 없는 사례: 다른 사례에 장이 있으면 자리는 남긴다(전환 때 아래가 움직이지 않게 · I-033)
    var anyChapters = scenarios.some(function (x) { return (x.chapters || []).length > 0; });
    this.chapters.classList.toggle('is-hidden', list.length === 0 && !anyChapters);
    this.chapters.classList.toggle('is-ghost', list.length === 0 && anyChapters);
    this.root.classList.toggle('has-chapters', list.length > 0);
    this.setChapter(-1);
  };

  /* n번째 장으로(Infinity = 각본 끝: 모든 장 완료) */
  Demo.prototype.setChapter = function (n) {
    if (!this.chapterList || !this.chapterNow) return;
    var sc = this.scenario(this.currentId);
    var list = (sc && sc.chapters) || [];
    var end = n === Infinity;
    var cur = end ? list.length - 1 : n;
    this.chapterIndex = end ? -1 : cur;
    var items = this.chapterList.children;
    for (var i = 0; i < items.length; i++) {
      var state = end || i < cur ? 'done' : i === cur ? 'current' : '';
      if (state) items[i].setAttribute('data-state', state);
      else items[i].removeAttribute('data-state');
      var fill = items[i].querySelector('.agd-ch-fill');
      if (fill) fill.style.width = state === 'done' ? '100%' : '0%';
    }
    var live = this.chapterLive;
    if (!live) return;
    var show = cur >= 0 ? cur : 0;
    var line = list[show] ? this.chapterLine(list, show, '') : el('span');
    // 같은 글이면 다시 넣지 않는다 — aria-live가 같은 문장을 두 번 읽지 않게(I-033)
    if (live.textContent === line.textContent) return;
    live.textContent = '';
    while (line.firstChild) live.appendChild(line.firstChild);
  };

  /* 지금 장 막대를 그 장 안의 진행만큼 채운다(done = 끝난 각본 줄 수) */
  Demo.prototype.fillChapter = function (done) {
    var cur = this.chapterIndex;
    if (!this.chapterList || cur < 0 || this.chapterStarts[cur] === undefined) return;
    var a = this.chapterStarts[cur];
    var b = this.scriptLength;
    for (var k = cur + 1; k < this.chapterStarts.length; k++) {
      if (this.chapterStarts[k] !== undefined) { b = this.chapterStarts[k]; break; }
    }
    var f = Math.max(0, Math.min(1, (done - a) / Math.max(1, b - a)));
    var li = this.chapterList.children[cur];
    var fill = li && li.querySelector('.agd-ch-fill');
    if (fill) fill.style.width = Math.round(f * 100) + '%';
  };

  /* 시나리오를 화면에 올린다(재생은 하지 않는다) */
  Demo.prototype.select = function (id) {
    var sc = this.scenario(id);
    if (!sc) return;
    var renderer = renderers[sc.renderer];
    if (!renderer) {
      warn('렌더러 "' + sc.renderer + '"가 등록되지 않았습니다.');
      return;
    }
    this.gen += 1; // 진행 중인 각본 취소
    this.currentId = id;
    if (this.viewId !== id) {
      this.view = renderer.mount(this.screen, sc);
      this.viewId = id;
    }
    this.view.reset();
    this.hideCursor(true);
    this.setProgress(0);
    this.syncInfo();
    this.renderChapters(sc);
    this.windowTitle.textContent = (sc.app && sc.app.windowTitle) || '';
    if (this.caption) this.caption.textContent = sc.caption || this.defaultCaption;
    this.root.classList.add('is-ready');
    this.started = false;
    if (projectOf(sc).id !== this.renderedProject) this.renderTabs();
    else this.syncTabs();
    this.syncControls();
  };

  /* ------------------------------------------------------------ 재생 제어 */

  Demo.prototype.running = function () {
    return this.started && !this.userPaused && this.visible && !this.docHidden;
  };

  Demo.prototype.onVisibility = function () {
    var self = this;
    if (this.currentId && !this.started && !reduceMotion && !this.userPaused && this.visible && !this.docHidden) {
      clearTimeout(this.startTimer);
      this.startTimer = setTimeout(function () {
        if (!self.started && !self.userPaused && self.visible && !self.docHidden) self.play(self.currentId);
      }, START_DELAY);
    }
    this.syncControls();
  };

  Demo.prototype.togglePlay = function () {
    if (!this.started) {
      this.userPaused = false;
      this.play(this.currentId);
      return;
    }
    this.userPaused = !this.userPaused;
    this.syncControls();
  };

  Demo.prototype.syncControls = function () {
    var playing = this.started && !this.userPaused;
    this.playBtn.setAttribute('data-state', playing ? 'playing' : 'paused');
    this.playBtn.setAttribute('aria-label', playing ? TEXT.pause : TEXT.play);
    var label = this.playBtn.querySelector('.agd-btn-text');
    if (label) label.textContent = playing ? TEXT.pause : TEXT.play;
    this.root.classList.toggle('is-paused', !this.running());
    this.wake();
  };

  /* 세워 둔 대기를 깨운다 — 아직 멈춤이면 다시 세워지고, 취소된 세대면 거절로 끝난다 */
  Demo.prototype.wake = function () {
    if (this.parked.length === 0) return;
    var list = this.parked;
    this.parked = [];
    for (var i = 0; i < list.length; i++) list[i]();
  };

  Demo.prototype.play = function (id) {
    var sc = this.scenario(id);
    if (!sc) return;
    if (this.currentId !== id || !this.view) this.select(id);
    this.gen += 1;
    this.started = true;
    this.syncControls();
    this.run(sc, this.gen, false);
  };

  /* 모션 줄이기 — 각본을 즉시 끝까지 그린 최종 화면 */
  Demo.prototype.renderFinal = function (id) {
    var sc = this.scenario(id);
    if (!sc) return;
    this.gen += 1;
    this.started = false;
    this.syncControls();
    this.run(sc, this.gen, true);
  };

  /* 일시정지 · 취소를 존중하는 대기. 멈춘 동안에는 타이머 없이 세워 두고(parked) 남은 시간을 보존한다 */
  Demo.prototype.sleep = function (ms, gen) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var remaining = ms;
      var last = Date.now();
      function resume() {
        last = Date.now(); // 멈춰 있던 시간은 세지 않는다
        tick();
      }
      function tick() {
        if (gen !== self.gen) return reject(CANCEL);
        if (!self.running()) {
          self.parked.push(resume);
          return;
        }
        var now = Date.now();
        remaining -= now - last;
        last = now;
        if (remaining <= 0) return resolve();
        setTimeout(tick, Math.min(remaining, 50));
      }
      tick();
    });
  };

  Demo.prototype.context = function (gen, instant) {
    var self = this;
    return {
      instant: instant,
      alive: function () { return gen === self.gen; },
      sleep: function (ms) {
        if (gen !== self.gen) return Promise.reject(CANCEL);
        return instant ? Promise.resolve() : self.sleep(ms, gen);
      }
    };
  };

  Demo.prototype.run = function (sc, gen, instant) {
    var self = this;
    var ctx = this.context(gen, instant);
    var script = sc.script || [];
    var i = 0;
    // 지난 회차의 토스트(util.toast)가 남지 않게
    var toasts = this.screen.querySelectorAll('.agd-k-toast');
    for (var t = 0; t < toasts.length; t++) toasts[t].parentNode.removeChild(toasts[t]);
    this.view.reset();
    this.hideCursor(true);
    this.setProgress(0);
    this.chapterStarts = [];
    this.scriptLength = script.length;
    for (var c = 0; c < script.length; c++) {
      if (script[c].do === 'chapter') this.chapterStarts[script[c].n] = c;
    }
    this.setChapter(-1);

    function step() {
      if (gen !== self.gen) return Promise.reject(CANCEL);
      if (i >= script.length) return Promise.resolve();
      var s = script[i];
      i += 1;
      var skip = instant && (s.do === 'wait' || s.do === 'cursor');
      return (skip ? Promise.resolve() : self.exec(s, ctx)).then(function () {
        if (gen === self.gen) {
          self.setProgress(i / script.length);
          self.fillChapter(i);
        }
        return step();
      });
    }

    step()
      .then(function () {
        if (gen === self.gen) self.setChapter(Infinity);
        if (instant) return null;
        self.hideCursor(false);
        return ctx.sleep(sc.hold || DEFAULT_HOLD).then(function () { self.next(sc); });
      })
      .catch(function (e) {
        if (e !== CANCEL) warn('각본 실행 실패: ' + (e && e.message ? e.message : e));
      });
  };

  Demo.prototype.exec = function (s, ctx) {
    if (s.do === 'wait') return ctx.sleep(s.ms || 0);
    if (s.do === 'chapter') {
      this.setChapter(s.n);
      return Promise.resolve();
    }
    if (s.do === 'cursor') return this.cursorTo(s.to, !!s.click, ctx);
    var fn = this.view.actions[s.do];
    if (!fn) {
      warn('알 수 없는 동작 "' + s.do + '"');
      return Promise.resolve();
    }
    return Promise.resolve(fn(s, ctx));
  };

  /* 각본이 끝났다 — 다음 탭(사용자가 고르지 않았고 여럿일 때) 또는 반복. 모션 줄이기면 최종 화면에서 멈춘다 */
  Demo.prototype.next = function (sc) {
    if (reduceMotion) {
      this.started = false;
      this.syncControls();
      return;
    }
    var id = sc.id;
    if (this.pickMode !== 'scenario') {
      var pool = this.pickMode === 'project'
        ? scenarios.filter(function (x) { return projectOf(x) === projectOf(sc); })
        : scenarios;
      if (pool.length > 1) id = pool[(pool.indexOf(sc) + 1) % pool.length].id;
    }
    this.play(id);
  };

  Demo.prototype.setProgress = function (p) {
    if (!this.bar) return;
    if (p === 0) {
      this.bar.classList.add('is-reset');
      this.bar.style.width = '0%';
      void this.bar.offsetWidth; // 0으로 즉시 돌린 뒤 전환을 다시 켠다
      this.bar.classList.remove('is-reset');
      return;
    }
    this.bar.style.width = Math.round(p * 1000) / 10 + '%';
  };

  /* --------------------------------------------------------------- 커서 */

  Demo.prototype.hideCursor = function (home) {
    this.cursor.classList.remove('is-on', 'is-click');
    if (home) {
      // 다음 첫 이동이 오른쪽 아래에서 시작하도록
      var w = this.stage.clientWidth;
      var h = this.stage.clientHeight;
      this.cursor.classList.add('is-jump');
      this.cursor.style.transform = 'translate(' + Math.round(w * 0.78) + 'px,' + Math.round(h * 0.86) + 'px)';
      void this.cursor.offsetWidth;
      this.cursor.classList.remove('is-jump');
    }
  };

  Demo.prototype.cursorTo = function (key, click, ctx) {
    var self = this;
    var target = this.view.target ? this.view.target(key) : null;
    if (!target) return Promise.resolve();
    var s = this.stage.getBoundingClientRect();
    var r = target.getBoundingClientRect();
    var x = Math.round(r.left - s.left + Math.min(r.width * 0.5, 40));
    var y = Math.round(r.top - s.top + r.height * 0.6);
    this.cursor.classList.add('is-on');
    this.cursor.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    return ctx.sleep(CURSOR_MS).then(function () {
      if (!click) return null;
      self.cursor.classList.remove('is-click');
      void self.cursor.offsetWidth;
      self.cursor.classList.add('is-click');
      target.classList.add('is-pressed');
      return ctx.sleep(CLICK_MS).then(function () { target.classList.remove('is-pressed'); });
    });
  };

  /* --------------------------------------------------------------- 크게 보기(설계 0004 §3-2) */

  Demo.prototype.setTheaterLabel = function (open) {
    if (!this.theaterBtn) return;
    this.theaterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    this.theaterBtn.setAttribute('data-state', open ? 'open' : 'closed');
    var label = this.theaterBtn.querySelector('.agd-btn-text');
    if (label) label.textContent = open ? TEXT.theaterClose : TEXT.theaterOpen;
  };

  Demo.prototype.openTheater = function () {
    if (this.theater || !this.player) return;
    this.theater = true;
    this.savedScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    this.root.classList.add('is-theater');
    document.documentElement.classList.add('agd-theater-open'); // 뒤 페이지 스크롤 잠금
    this.player.setAttribute('role', 'dialog');
    this.player.setAttribute('aria-modal', 'true');
    this.player.setAttribute('aria-label', TEXT.theaterLabel);
    this.setTheaterLabel(true);
    this.measure(true);
    if (this.theaterClose && this.theaterClose.focus) this.theaterClose.focus({ preventScroll: true });
  };

  Demo.prototype.closeTheater = function () {
    if (!this.theater) return;
    this.theater = false;
    this.root.classList.remove('is-theater');
    document.documentElement.classList.remove('agd-theater-open');
    this.player.removeAttribute('role');
    this.player.removeAttribute('aria-modal');
    this.player.removeAttribute('aria-label');
    this.setTheaterLabel(false);
    this.measure(true);
    // 스크롤 잠금을 풀 때 위치가 바뀐 브라우저만 원래 자리로(사용자가 연 창을 닫는 동작)
    var now = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (now !== this.savedScroll) window.scrollTo(0, this.savedScroll);
    if (this.theaterBtn && this.theaterBtn.focus) this.theaterBtn.focus({ preventScroll: true });
  };

  /* 크게 보기 안에서 Tab이 뒤 페이지로 나가지 않게 처음 ↔ 끝을 잇는다 */
  Demo.prototype.trapTab = function (e) {
    var list = Array.prototype.slice.call(this.player.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')).filter(function (b) {
      return !b.disabled && b.tabIndex >= 0 && b.offsetParent !== null;
    });
    if (list.length === 0) return;
    var first = list[0];
    var last = list[list.length - 1];
    var active = document.activeElement;
    if (e.shiftKey && (active === first || !this.player.contains(active))) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && (active === last || !this.player.contains(active))) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  /* --------------------------------------------------------------- 시작 */

  function init() {
    var roots = document.querySelectorAll('[data-agent-demo]');
    for (var i = 0; i < roots.length; i++) {
      if (roots[i].getAttribute('data-agent-demo-ready')) continue;
      roots[i].setAttribute('data-agent-demo-ready', 'true');
      demos.push(new Demo(roots[i], demos.length));
    }
  }

  // defer 스크립트(렌더러 · 시나리오)가 모두 실행된 뒤 DOMContentLoaded가 온다
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);

  /* --------------------------------------------------------------- 렌더러 공용 도우미(설계 0002 §4-2)
     규정 검색 렌더러(rag-chat)는 자체 도우미를 그대로 쓴다 — 검증된 코드라 옮기지 않았다 */

  var STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.8 5.3 5.3 1.8-5.3 1.8L12 16.7l-1.8-5.3-5.3-1.8 5.3-1.8z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24"' + STROKE + ' stroke-width="2.4"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"' + STROKE + ' stroke-width="3.4"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M6 9l6 6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M9 6l6 6-6 6"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    book: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/></svg>',
    file: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>',
    chart: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/></svg>',
    chat: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 5v14M5 12h14"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"' + STROKE + '><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
    copy: '<svg viewBox="0 0 24 24"' + STROKE + '><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
    download: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
    save: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M5 3h11l3 3v13a2 2 0 01-2 2H7a2 2 0 01-2-2z"/><path d="M8 3v5h7M8 21v-7h8v7"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/></svg>',
    doc: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
    help: '<svg viewBox="0 0 24 24"' + STROKE + '><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 014.6 1.3c0 1.7-2.1 2-2.1 3.4M12 17.3v.2"/></svg>',
    info: '<svg viewBox="0 0 24 24"' + STROKE + '><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.2"/></svg>',
    warning: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.3v.2"/></svg>',
    close: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  function pad2(n) {
    return ('0' + n).slice(-2);
  }

  var util = {
    ICONS: ICONS,
    /* 렌더러 전용 아이콘을 더한다(같은 이름이면 덮어쓴다) */
    addIcons: function (map) {
      for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) ICONS[k] = map[k];
    },
    /* 요소 만들기 — 글은 textContent로만 넣는다(HTML 해석 없음) */
    h: el,
    icon: function (name, cls) {
      var s = el('span', 'agd-k-ico' + (cls ? ' ' + cls : ''));
      s.innerHTML = ICONS[name] || '';
      return s;
    },
    /* 컨테이너 안에서만 스크롤해 el을 보이게 한다(페이지는 그대로) */
    reveal: function (container, target) {
      if (!container || !target) return;
      var c = container.getBoundingClientRect();
      var r = target.getBoundingClientRect();
      if (r.top < c.top + 12) container.scrollTop -= c.top + 12 - r.top + 24;
      else if (r.bottom > c.bottom - 12) container.scrollTop += r.bottom - c.bottom + 36;
    },
    /* 스트리밍 단위 — 인용 [n]과 ** 는 한 덩어리 */
    units: function (text) {
      return String(text).match(/\[\d+\]|\*\*|[\s\S]/g) || [];
    },
    nonSpaceLength: function (text) {
      return String(text).replace(/\s/g, '').length;
    },
    time: {
      hm: function () {
        var d = new Date();
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      },
      mdhm: function () {
        var d = new Date();
        return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + util.time.hm();
      },
      ymdhm: function () {
        var d = new Date();
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + util.time.hm();
      }
    },
    /* 화면 아래 가운데 토스트. 모션 줄이기(instant)면 그리지 않는다. 다음 토스트가 오면 바꿔 단다 */
    toast: function (screenEl, text, opts, ctx) {
      if (!screenEl || (ctx && ctx.instant)) return null;
      opts = opts || {};
      var old = screenEl.querySelector('.agd-k-toast');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var t = el('div', 'agd-k-toast' + (opts.tone ? ' is-' + opts.tone : ''));
      if (opts.tone) t.appendChild(util.icon(opts.tone === 'success' ? 'check' : opts.tone === 'warning' ? 'warning' : 'info', 'agd-k-toast-ico'));
      t.appendChild(el('span', null, text));
      screenEl.appendChild(t);
      var ms = opts.ms || 3000;
      if (ctx && ctx.sleep) {
        // 각본 시간(일시정지 존중)으로 사라지게 한다 — 취소되면 다음 reset이 화면을 비운다
        ctx.sleep(ms).then(function () {
          if (t.parentNode) t.classList.add('is-out');
          return ctx.sleep(250);
        }).then(function () {
          if (t.parentNode) t.parentNode.removeChild(t);
        }, function () {});
      }
      return t;
    }
  };

  window.AgentDemo = {
    version: VERSION,
    registerRenderer: registerRenderer,
    registerProject: registerProject,
    registerScenario: registerScenario,
    init: init,
    util: util
  };
})(window, document);
