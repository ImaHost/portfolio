/*
 * 화면 유형 'draft-workspace' — 답변 작성 창(3열) (설계 0002 §3-2)
 * 원본 답변 작성 창의 구조 · 문구를 재구성했다.
 *   머리: 요구서번호 · 요구사항 · 처리상태 · 저장 상태 / 다음 할 일 띠
 *   ① 초안 만들기(대화창): 환영 안내 · 추천 칩 · 말풍선 · 처리 과정 · 초안 카드 · 입력창
 *   ② 답변 편집: 생성 중 상자(줄 단위 미리보기) → 최종 본문 · 글자 수 · [확인 필요] 표시
 *   ③ 근거 · 제출 첨부 · 이력 탭 + 행동 바
 *
 * 각본 동작(actions): suggest · step · write · apply · finish · evidence · open · blank
 * 커서 목표(target): 'suggest:<i>' · 'evidence:<i>' · 'blank:<i>' — 지금 배치에서 숨겨져 있으면 null(엔진이 커서 장면을 건너뜀)
 * 글은 모두 textContent로 넣는다. 대기는 ctx.sleep만 쓴다(일시정지 · 취소 존중). 내부 스크롤만 움직인다.
 */
(function (window, document) {
  'use strict';
  if (!window.AgentDemo || !window.AgentDemo.util) return;

  var U = window.AgentDemo.util;
  var h = U.h;
  var icon = U.icon;

  var BLANK = '[확인 필요]';

  /* 원본 화면 문구 */
  var LABEL = {
    dialog: '답변 작성',
    number: '요구서번호',
    itemNo: function (no) { return '요구사항 ' + no; },
    status: '처리상태',
    statusLabel: '답변중',
    statusSub: '답변 작성 중',
    requester: '배포부서',
    dept: '배정 부서',
    saveState: '저장 상태',
    saveNone: '저장 기록 없음',
    saved: function (at) { return '임시저장됨 · ' + at; },
    next: '다음 할 일',
    nextEmpty: '왼쪽 대화창에 초안을 요청하세요 · 참고할 자료는 + 버튼에서 고릅니다',
    nextWrite: '답변을 작성하고 내용을 확인한 뒤 ‘답변제출’을 누르세요',
    nextBlanks: function (n) { return '[확인 필요] ' + n + '곳을 직접 확인해 채운 뒤 답변제출을 진행하세요'; },
    kind: {
      PRE_MATERIAL: '공통자료',
      TEAM_MATERIAL: '업무자료',
      ITEM_REFERENCE: '자료올리기',
      HISTORY_ANSWER: '질의답변이력'
    },
    chat: {
      step: '1',
      title: '초안 만들기',
      network: '내부망',
      reset: '대화 초기화',
      welcome: function (pre, team, upload) {
        return [
          '이 요구사항의 답변 초안을 함께 만듭니다.',
          '- 고른 자료에서 질문마다 근거를 찾아 **편집기에 초안을 작성**합니다.',
          '- 공단 답변서 문체로 씁니다 · 형식 · 길이는 대화로 요청하세요(예: 서술식으로 써 줘, 더 짧게 줄여 줘).',
          '- 편집기에서 글을 고르고 요청하면 그 부분만 고칩니다.',
          '- **+** 버튼에서 참고할 자료를 바꿀 수 있습니다.',
          '- ' + (pre + team + upload > 0
            ? '지금 고른 자료: 공통자료 ' + pre + ' · 업무자료 ' + team + ' · 자료올리기 ' + upload
            : '아직 고른 자료가 없습니다')
        ].join('\n');
      },
      usedGroup: function (kind, n) { return kind + ' ' + n; },
      trayGroup: function (kind, n) { return kind + ' ' + n + '건'; },
      thinkRunning: function (step) { return step + '…'; },
      thinkDone: function (n) { return '처리 과정 · ' + n + '단계'; },
      seconds: function (n) { return n + '초'; },
      understand: '요청 이해',
      understandDraft: '초안 작성',
      cardTitle: function (v, format) { return '초안 v' + v + ' · ' + format; },
      cardWriting: '편집기에 작성 중…',
      cardDone: function (chars, evidence, blanks) {
        return '편집기에 작성 완료 · ' + chars + '자 · 근거 ' + evidence + '건 · [확인 필요] ' + blanks + '곳';
      },
      cardView: '편집기에서 보기',
      blank: function (i) { return '[확인 필요] ' + i + '번째'; },
      placeholder: '요청을 입력하세요 · 예) 초안 만들어 줘, 표 위주로 다시 써 줘',
      placeholderEdit: '요청을 입력하세요 · 편집기에서 글을 고르고 요청하면 그 부분만 고칩니다',
      note: '내부망 AI · AI가 만든 초안은 사실과 다를 수 있어 확인이 필요합니다'
    },
    editor: {
      step: '2',
      title: '답변 편집',
      metaEmpty: '작성 전',
      metaApplied: function (v) { return '초안 v' + v + ' 적용'; },
      generatedAt: function (at) { return at + ' 생성'; },
      copy: '답변 복사',
      download: '내려받기',
      save: '임시저장',
      sizeDefault: '기본',
      tableInsert: '표 넣기',
      symbol: '기호',
      emptyTitle: '작성한 답변이 없습니다',
      emptyHint: '왼쪽 대화창에 요청하면 초안을 이곳에 작성합니다. 직접 작성할 수도 있습니다.',
      chars: function (n) { return n + '자'; },
      blanks: function (n) { return '[확인 필요] ' + n + '곳 남음 · 직접 확인해 채워 주세요'; },
      styleNote: '공단 답변서 문체로 작성합니다 · 형식 · 길이는 대화로 요청하세요',
      evidenceTag: function (n) { return '근거 ' + n + '건'; }
    },
    generation: {
      writing: '초안 작성 중',
      locked: '생성 중에는 편집할 수 없습니다',
      chip: function (v) { return '초안 v' + v + ' 생성 중'; },
      applied: function (v) { return '초안 v' + v + objectParticle(String(v)) + ' 편집 영역에 표시했습니다'; }
    },
    side: { evidence: '근거', attachments: '제출 첨부', history: '이력' },
    evidence: {
      title: '초안 생성 근거',
      meta: function (v, at, n) { return '초안 v' + v + ' · 생성 ' + at + ' · 근거 ' + n + '건'; },
      partial: '일부 내용만 근거가 확인되었습니다. 아래 근거가 답변 전체를 검증하지는 않습니다.',
      partialBlanks: '일부 내용만 근거가 확인되었습니다. 본문의 [확인 필요] 표시는 근거를 찾지 못한 부분이며, 아래 근거가 답변 전체를 검증하지는 않습니다.',
      location: function (s) { return '위치 · ' + s; },
      supports: function (s) { return '뒷받침하는 부분 · ' + s; },
      quote: function (s) { return s ? '참고한 내용 · ' + s : '참고한 내용'; }
    },
    attach: {
      title: '답변 제출용 첨부파일',
      empty: '제출용 첨부파일이 없습니다. 본문만으로도 제출할 수 있습니다.',
      add: '첨부파일 추가',
      sizeNote: '파일당 50 MB'
    },
    actions: { objection: '이의제기', submit: '답변제출' },
    blockers: {
      running: '초안 생성이 끝난 뒤 제출할 수 있습니다.',
      empty: '답변 본문 또는 제출용 첨부파일이 있어야 제출할 수 있습니다. 참고자료만으로는 제출할 수 없습니다.'
    }
  };

  /* 이 화면에만 쓰는 아이콘 */
  var STROKE = ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  U.addIcons({
    dwPanel: '<svg viewBox="0 0 24 24"' + STROKE + '><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>',
    dwNewChat: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4z"/></svg>',
    dwAlignLeft: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
    dwAlignCenter: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
    dwAlignRight: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>',
    dwAlignJustify: '<svg viewBox="0 0 24 24"' + STROKE + '><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>',
    dwTable: '<svg viewBox="0 0 24 24"' + STROKE + '><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/></svg>'
  });

  /* 숫자 끝자리 받침 → 을/를(원본 조사 규칙) */
  function objectParticle(word) {
    var last = String(word).slice(-1);
    if (/[013678]/.test(last)) return '을';
    if (/[2459]/.test(last)) return '를';
    var code = last.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) return code % 28 !== 0 ? '을' : '를';
    return '을(를)';
  }

  function countOf(text, word) {
    var n = 0;
    var at = String(text).indexOf(word);
    while (at >= 0) {
      n += 1;
      at = String(text).indexOf(word, at + word.length);
    }
    return n;
  }

  function visible(el) {
    return el && el.offsetParent !== null ? el : null;
  }

  /* 한 줄 안의 **굵게** — 쓰는 중이라 짝이 없는 ** 는 숨긴다 */
  function inline(parent, text) {
    if ((text.match(/\*\*/g) || []).length % 2 === 1) {
      text = /\*\*$/.test(text) ? text.slice(0, -2) : text + '**';
    }
    text.split(/(\*\*[\s\S]+?\*\*)/g).forEach(function (part) {
      if (!part) return;
      var bold = /^\*\*([\s\S]+)\*\*$/.exec(part);
      if (bold) parent.appendChild(h('strong', null, bold[1]));
      else parent.appendChild(document.createTextNode(part));
    });
  }

  /* 대화 답 글 — 문단 · "- " 목록 · 굵게(원본 대화 답 표시) */
  function renderMd(box, text) {
    box.textContent = '';
    var list = null;
    String(text).split('\n').forEach(function (line) {
      var item = /^\s*-\s+(.*)$/.exec(line);
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

  function mount(screen, scenario) {
    var app = scenario.app || {};
    var inquiry = app.inquiry || {};
    var facts = app.facts || {};
    var sources = app.sources || [];
    var aiName = app.aiName || '';

    var root;
    var el = {};
    var st;

    /* ------------------------------------------------------------ 뼈대 */

    function fact(label, value, cls) {
      var f = h('div', 'agd-dw-fact' + (cls ? ' ' + cls : ''));
      f.appendChild(h('span', 'agd-dw-factlabel', label));
      var v = h('div', 'agd-dw-factvalue');
      if (typeof value === 'string') v.appendChild(h('span', 'agd-dw-deptname', value));
      else v.appendChild(value);
      f.appendChild(v);
      return f;
    }

    function buildHead() {
      var head = h('div', 'agd-dw-head');
      var left = h('div', 'agd-dw-headl');
      var meta = h('p', 'agd-dw-meta');
      meta.appendChild(h('span', 'agd-dw-metatitle', LABEL.dialog));
      meta.appendChild(h('span', 'agd-dw-sep', '·'));
      meta.appendChild(h('span', 'agd-dw-metalabel', LABEL.number));
      meta.appendChild(h('span', 'agd-dw-mono', inquiry.number || ''));
      meta.appendChild(h('span', 'agd-dw-mono is-muted', LABEL.itemNo(inquiry.itemNo || '')));
      meta.appendChild(h('span', 'agd-dw-sep', '·'));
      meta.appendChild(h('span', 'agd-dw-agency', inquiry.agency || ''));
      left.appendChild(meta);
      left.appendChild(h('p', 'agd-dw-req', inquiry.requirement || ''));
      head.appendChild(left);

      var list = h('div', 'agd-dw-facts');
      var status = h('div', 'agd-dw-statusvalue');
      status.appendChild(h('span', 'agd-k-pill is-info', LABEL.statusLabel));
      status.appendChild(h('span', 'agd-dw-factsub', LABEL.statusSub));
      list.appendChild(fact(LABEL.status, status));
      list.appendChild(fact(LABEL.requester, facts.requester || '—', 'is-dept'));
      list.appendChild(fact(LABEL.dept, facts.dept || '—', 'is-dept'));
      el.save = h('span', 'agd-dw-save');
      el.save.setAttribute('data-save', 'none');
      el.save.appendChild(h('i', 'agd-dw-savedot'));
      el.saveText = h('span', null, LABEL.saveNone);
      el.save.appendChild(el.saveText);
      list.appendChild(fact(LABEL.saveState, el.save));
      head.appendChild(list);
      return head;
    }

    function buildBand() {
      var band = h('div', 'agd-dw-band');
      band.appendChild(h('span', 'agd-k-tag is-primary', LABEL.next));
      el.next = h('span', 'agd-dw-nexttext', LABEL.nextEmpty);
      band.appendChild(el.next);
      el.band = band;

      // 좁은 화면(sm) 한 줄 상태 — 처리 과정 제목을 따라간다
      var line = h('div', 'agd-dw-smstatus');
      el.smIcon = h('span', 'agd-dw-smicon');
      el.smText = h('span', 'agd-dw-smtext');
      line.appendChild(el.smIcon);
      line.appendChild(el.smText);
      el.smStatus = line;
    }

    function buildChat() {
      var col = h('div', 'agd-dw-col agd-dw-chat');
      var head = h('div', 'agd-k-panelhead agd-dw-colhead');
      head.appendChild(h('span', 'agd-k-dot', LABEL.chat.step));
      head.appendChild(h('span', 'agd-dw-coltitle', LABEL.chat.title));
      var net = h('span', 'agd-dw-net');
      net.appendChild(icon('shield'));
      net.appendChild(h('span', null, LABEL.chat.network));
      head.appendChild(net);
      var acts = h('span', 'agd-dw-colacts');
      var reset = h('span', 'agd-k-btn is-xs is-outline agd-dw-reset');
      reset.appendChild(icon('dwNewChat'));
      reset.appendChild(h('span', null, LABEL.chat.reset));
      acts.appendChild(reset);
      var fold = h('span', 'agd-dw-iconbtn agd-dw-fold');
      fold.appendChild(icon('dwPanel'));
      acts.appendChild(fold);
      head.appendChild(acts);
      col.appendChild(head);

      el.msgs = h('div', 'agd-dw-msgs');
      col.appendChild(el.msgs);

      var composer = h('div', 'agd-dw-composer');
      var box = h('div', 'agd-dw-box');
      var tray = h('div', 'agd-dw-tray');
      groups().forEach(function (g) {
        var chip = h('span', 'agd-dw-token');
        chip.appendChild(h('i', 'agd-dw-kdot', null)).setAttribute('data-kind', g.kind);
        chip.appendChild(h('span', 'agd-dw-tokentext',
          g.names.length === 1 ? g.names[0] : LABEL.chat.trayGroup(LABEL.kind[g.kind] || g.kind, g.names.length)));
        tray.appendChild(chip);
      });
      if (tray.childNodes.length) box.appendChild(tray);
      el.input = h('div', 'agd-dw-input', LABEL.chat.placeholder);
      box.appendChild(el.input);
      var foot = h('div', 'agd-dw-boxfoot');
      var plus = h('span', 'agd-dw-iconbtn');
      plus.appendChild(icon('plus'));
      foot.appendChild(plus);
      el.send = h('span', 'agd-dw-send');
      foot.appendChild(el.send);
      box.appendChild(foot);
      composer.appendChild(box);
      var note = h('p', 'agd-dw-note');
      note.appendChild(icon('lock'));
      note.appendChild(h('span', null, LABEL.chat.note));
      composer.appendChild(note);
      col.appendChild(composer);
      return col;
    }

    function toolbarButton(content, cls) {
      var b = h('span', 'agd-dw-tool' + (cls ? ' ' + cls : ''));
      if (typeof content === 'string') b.appendChild(h('span', 'agd-dw-glyph', content));
      else b.appendChild(content);
      return b;
    }

    function buildEditor() {
      var col = h('div', 'agd-dw-col agd-dw-editor');
      var head = h('div', 'agd-k-panelhead agd-dw-colhead');
      head.appendChild(h('span', 'agd-k-dot', LABEL.editor.step));
      head.appendChild(h('span', 'agd-dw-coltitle', LABEL.editor.title));
      el.edMeta = h('span', 'agd-dw-edmeta');
      head.appendChild(el.edMeta);
      el.evTag = h('span', 'agd-k-tag is-primary agd-dw-evtag');
      head.appendChild(el.evTag);
      var acts = h('span', 'agd-dw-colacts agd-dw-edacts');
      acts.appendChild(h('span', 'agd-k-btn is-xs', LABEL.editor.copy));
      acts.appendChild(h('span', 'agd-k-btn is-xs agd-dw-optbtn', LABEL.editor.download));
      acts.appendChild(h('span', 'agd-k-btn is-xs is-disabled agd-dw-optbtn', LABEL.editor.save));
      head.appendChild(acts);
      col.appendChild(head);

      // 서식 도구 막대(동작 없음 · 모양만)
      var bar = h('div', 'agd-dw-toolbar');
      var size = h('span', 'agd-dw-select');
      size.appendChild(h('span', null, LABEL.editor.sizeDefault));
      size.appendChild(icon('chevron'));
      bar.appendChild(size);
      bar.appendChild(h('i', 'agd-dw-toolsep'));
      bar.appendChild(toolbarButton('가', 'is-bold'));
      bar.appendChild(toolbarButton('가', 'is-italic'));
      bar.appendChild(toolbarButton('가', 'is-underline'));
      bar.appendChild(h('i', 'agd-dw-toolsep'));
      ['dwAlignLeft', 'dwAlignCenter', 'dwAlignRight', 'dwAlignJustify'].forEach(function (name) {
        bar.appendChild(toolbarButton(icon(name)));
      });
      bar.appendChild(h('i', 'agd-dw-toolsep'));
      var table = h('span', 'agd-dw-tool is-text');
      table.appendChild(icon('dwTable'));
      table.appendChild(h('span', null, LABEL.editor.tableInsert));
      bar.appendChild(table);
      var sym = h('span', 'agd-dw-select');
      sym.appendChild(h('span', null, LABEL.editor.symbol));
      sym.appendChild(icon('chevron'));
      bar.appendChild(sym);
      col.appendChild(bar);

      el.edBody = h('div', 'agd-dw-edbody');

      // 생성 중 상자 — 옅은 회색 · 편집 불가 · 첫 줄 진행 · 완성된 줄 + 끝 커서
      el.gen = h('div', 'agd-dw-genbox');
      var gh = h('div', 'agd-dw-genhead');
      gh.appendChild(h('span', 'agd-k-spin'));
      gh.appendChild(h('strong', 'agd-dw-gentitle', LABEL.generation.writing));
      el.genPhase = h('span', 'agd-dw-genphase');
      gh.appendChild(el.genPhase);
      gh.appendChild(h('span', 'agd-dw-genlocked', LABEL.generation.locked));
      el.gen.appendChild(gh);
      el.genLines = h('div', 'agd-dw-lines');
      el.gen.appendChild(el.genLines);
      el.edBody.appendChild(el.gen);

      // 편집기(빈 상태 겹침 → 적용된 본문)
      el.edBox = h('div', 'agd-dw-edbox');
      el.edLines = h('div', 'agd-dw-lines');
      el.edBox.appendChild(el.edLines);
      var empty = h('div', 'agd-dw-empty');
      var ei = h('span', 'agd-dw-emptyicon');
      ei.appendChild(icon('pencil'));
      empty.appendChild(ei);
      empty.appendChild(h('strong', 'agd-dw-emptytitle', LABEL.editor.emptyTitle));
      empty.appendChild(h('span', null, LABEL.editor.emptyHint));
      el.edBox.appendChild(empty);
      el.edBody.appendChild(el.edBox);

      var foot = h('div', 'agd-dw-edfoot');
      el.chars = h('span', 'agd-dw-chars', LABEL.editor.chars(0));
      foot.appendChild(el.chars);
      el.blankTag = h('span', 'agd-k-tag is-warning agd-dw-blanktag');
      foot.appendChild(el.blankTag);
      foot.appendChild(h('span', 'agd-dw-stylenote', LABEL.editor.styleNote));
      el.edBody.appendChild(foot);
      col.appendChild(el.edBody);
      return col;
    }

    function tab(label) {
      var t = h('span', 'agd-k-tab');
      t.appendChild(h('span', null, label));
      var c = h('span', 'agd-k-tab-count', '0');
      t.appendChild(c);
      t.count = c;
      return t;
    }

    function sectionTitle(text) {
      var row = h('div', 'agd-dw-sectitle');
      row.appendChild(h('span', null, text));
      row.appendChild(icon('help', 'agd-dw-help'));
      return row;
    }

    function buildSide() {
      var col = h('div', 'agd-dw-col agd-dw-side');
      var tabs = h('div', 'agd-k-tabs agd-dw-tabs');
      el.tabEvid = tab(LABEL.side.evidence);
      el.tabAtt = tab(LABEL.side.attachments);
      el.tabHist = tab(LABEL.side.history);
      tabs.appendChild(el.tabEvid);
      tabs.appendChild(el.tabAtt);
      tabs.appendChild(el.tabHist);
      col.appendChild(tabs);

      el.sideScroll = h('div', 'agd-dw-sidescroll');
      el.paneEvid = h('div', 'agd-dw-pane');
      el.paneAtt = h('div', 'agd-dw-pane');
      el.paneAtt.appendChild(sectionTitle(LABEL.attach.title));
      el.paneAtt.appendChild(h('p', 'agd-dw-emptyline', LABEL.attach.empty));
      var add = h('span', 'agd-k-btn is-outline agd-dw-block');
      add.appendChild(icon('upload'));
      add.appendChild(h('span', null, LABEL.attach.add));
      el.paneAtt.appendChild(add);
      el.paneAtt.appendChild(h('p', 'agd-dw-helper', LABEL.attach.sizeNote));
      el.sideScroll.appendChild(el.paneEvid);
      el.sideScroll.appendChild(el.paneAtt);
      col.appendChild(el.sideScroll);

      var bar = h('div', 'agd-dw-actionbar');
      el.blockers = h('ul', 'agd-dw-blockers');
      bar.appendChild(el.blockers);
      var btns = h('div', 'agd-dw-actbtns');
      btns.appendChild(h('span', 'agd-k-btn', LABEL.actions.objection));
      el.submit = h('span', 'agd-k-btn is-primary agd-dw-submit', LABEL.actions.submit);
      btns.appendChild(el.submit);
      bar.appendChild(btns);
      col.appendChild(bar);
      return col;
    }

    /* 고른 자료 묶음(공통자료 · 업무자료 · 자료올리기 순) */
    function groups() {
      var order = ['PRE_MATERIAL', 'TEAM_MATERIAL', 'ITEM_REFERENCE'];
      return order.map(function (kind) {
        return {
          kind: kind,
          names: sources.filter(function (s) { return s.kind === kind; }).map(function (s) { return s.name; })
        };
      }).filter(function (g) { return g.names.length > 0; });
    }

    function countKind(kind) {
      return sources.filter(function (s) { return s.kind === kind; }).length;
    }

    /* ------------------------------------------------------------ 부분 갱신 */

    function setSend(mode) {
      el.send.textContent = '';
      el.send.className = 'agd-dw-send' + (mode === 'stop' ? ' is-stop' : '');
      el.send.appendChild(icon(mode === 'stop' ? 'stop' : 'arrowUp'));
    }

    function setBlockers(codes) {
      el.blockers.textContent = '';
      codes.forEach(function (code) {
        el.blockers.appendChild(h('li', null, LABEL.blockers[code]));
      });
      el.submit.classList.toggle('is-off', codes.length > 0);
    }

    function setTab(which) {
      el.tabEvid.classList.toggle('is-active', which === 'evid');
      el.tabAtt.classList.toggle('is-active', which === 'att');
      el.paneEvid.style.display = which === 'evid' ? '' : 'none';
      el.paneAtt.style.display = which === 'att' ? '' : 'none';
      el.sideScroll.scrollTop = 0;
    }

    function setMeta(kind, text, helper) {
      el.edMeta.textContent = '';
      if (kind === 'helper') {
        el.edMeta.appendChild(h('span', 'agd-dw-helpertext', text));
        return;
      }
      var tag = h('span', 'agd-k-tag ' + (kind === 'running' ? 'is-info' : 'is-primary'));
      if (kind === 'running') tag.appendChild(h('span', 'agd-k-spin agd-dw-tagspin'));
      tag.appendChild(document.createTextNode(text));
      el.edMeta.appendChild(tag);
      if (helper) el.edMeta.appendChild(h('span', 'agd-dw-helpertext', helper));
    }

    function setSmStatus(state, text) {
      el.smIcon.textContent = '';
      el.smIcon.className = 'agd-dw-smicon';
      if (state === 'run') el.smIcon.appendChild(h('span', 'agd-k-spin'));
      else el.smIcon.appendChild(icon('check'));
      el.smText.textContent = text;
    }

    function setSeconds(sec) {
      if (sec === undefined || sec === null || !st.turn) return;
      st.sec = sec;
      st.turn.time.textContent = LABEL.chat.seconds(sec);
    }

    function toBottom() {
      el.msgs.scrollTop = el.msgs.scrollHeight;
    }

    /* 대화 목록 안에서만 — node 윗변이 목록 위쪽 가까이 오게(시연 창이 원본보다 낮아 마무리 장면을 처리 과정부터 보인다) */
    function showFrom(node) {
      var top = node.getBoundingClientRect().top - el.msgs.getBoundingClientRect().top;
      el.msgs.scrollTop = Math.max(0, el.msgs.scrollTop + top - 10);
    }

    function lineEl(text) {
      var line = h('div', 'agd-dw-line');
      if (text === '') line.classList.add('is-empty');
      else line.textContent = text;
      return line;
    }

    /* 편집기 본문 — [확인 필요] 자리는 따로 감싼다(선택 강조용 · 평소 모양은 같다) */
    function renderEditorText(text) {
      el.edLines.textContent = '';
      st.blankMarks = [];
      String(text).split('\n').forEach(function (raw) {
        var line = h('div', 'agd-dw-line');
        if (raw === '') {
          line.classList.add('is-empty');
          el.edLines.appendChild(line);
          return;
        }
        raw.split(/(\[확인 필요\])/).forEach(function (part) {
          if (!part) return;
          if (part === BLANK) {
            var mark = h('span', 'agd-dw-mark', part);
            line.appendChild(mark);
            st.blankMarks.push(mark);
          } else {
            line.appendChild(document.createTextNode(part));
          }
        });
        el.edLines.appendChild(line);
      });
    }

    /* ------------------------------------------------------------ 대화 */

    function avatar() {
      var av = h('span', 'agd-dw-avatar');
      av.appendChild(icon('sparkle'));
      return av;
    }

    function chips(items, cls, store) {
      var g = h('div', 'agd-dw-chips');
      items.forEach(function (text) {
        var c = h('span', 'agd-k-chip ' + (cls || ''), text);
        g.appendChild(c);
        if (store) store.push(c);
      });
      return g;
    }

    function renderWelcome() {
      var turn = h('div', 'agd-dw-turn agd-dw-ai');
      turn.appendChild(avatar());
      var body = h('div', 'agd-dw-aibody');
      body.appendChild(h('div', 'agd-dw-ainame', aiName));
      var md = h('div', 'agd-dw-md');
      renderMd(md, LABEL.chat.welcome(countKind('PRE_MATERIAL'), countKind('TEAM_MATERIAL'), countKind('ITEM_REFERENCE')));
      body.appendChild(md);
      st.suggestChips = [];
      body.appendChild(chips(app.suggestions || [], 'agd-dw-sug', st.suggestChips));
      turn.appendChild(body);
      el.msgs.appendChild(turn);
    }

    function buildUserTurn(text) {
      var u = h('div', 'agd-dw-turn agd-dw-user');
      if (app.user) u.appendChild(h('span', 'agd-dw-usermeta', app.user));
      u.appendChild(h('div', 'agd-dw-bubble', text));
      var used = h('div', 'agd-dw-used');
      groups().forEach(function (g) {
        var c = h('span', 'agd-dw-token');
        c.appendChild(h('i', 'agd-dw-kdot')).setAttribute('data-kind', g.kind);
        c.appendChild(h('span', 'agd-dw-tokentext', LABEL.chat.usedGroup(LABEL.kind[g.kind] || g.kind, g.names.length)));
        used.appendChild(c);
      });
      u.appendChild(used);
      return u;
    }

    function buildAiTurn() {
      var t = {};
      t.el = h('div', 'agd-dw-turn agd-dw-ai');
      t.el.appendChild(avatar());
      t.body = h('div', 'agd-dw-aibody');
      var name = h('div', 'agd-dw-ainame', aiName);
      name.appendChild(h('span', 'agd-dw-aitime', U.time.hm()));
      t.body.appendChild(name);

      // 처리 과정 — 진행 중 펼침 · 끝나면 한 줄로 접힘
      t.think = h('div', 'agd-dw-think');
      t.think.setAttribute('data-state', 'RUNNING');
      t.think.setAttribute('data-open', '');
      var head = h('div', 'agd-dw-thinkhead');
      t.thinkIcon = h('span', 'agd-dw-thinkicon');
      t.thinkIcon.appendChild(h('span', 'agd-k-spin'));
      head.appendChild(t.thinkIcon);
      t.title = h('span', 'agd-dw-thinktitle agd-k-loop');
      head.appendChild(t.title);
      t.time = h('span', 'agd-dw-thinktime', LABEL.chat.seconds(0));
      head.appendChild(t.time);
      head.appendChild(icon('chevron', 'agd-dw-chev'));
      t.think.appendChild(head);
      t.steps = h('ol', 'agd-dw-steps');
      t.think.appendChild(t.steps);
      t.body.appendChild(t.think);

      // 초안 카드
      t.card = h('div', 'agd-dw-card');
      var main = h('div', 'agd-dw-cardmain');
      var ci = h('span', 'agd-dw-cardicon');
      ci.appendChild(icon('doc'));
      main.appendChild(ci);
      var txt = h('span', 'agd-dw-cardtext');
      txt.appendChild(h('strong', 'agd-dw-cardtitle', LABEL.chat.cardTitle(st.version, st.format)));
      t.cardSub = h('span', 'agd-dw-cardsub');
      txt.appendChild(t.cardSub);
      main.appendChild(txt);
      main.appendChild(h('span', 'agd-k-btn is-xs agd-dw-cardbtn', LABEL.chat.cardView));
      t.card.appendChild(main);
      t.body.appendChild(t.card);

      t.el.appendChild(t.body);
      return t;
    }

    function addStep(t, label, detail, state) {
      var li = h('li', 'agd-dw-step');
      li.setAttribute('data-s', state);
      var ic = h('span', 'agd-dw-stepicon');
      if (state === 'done') ic.appendChild(icon('check'));
      else ic.classList.add('agd-k-spin');
      li.appendChild(ic);
      var text = h('span', 'agd-dw-steptext');
      text.appendChild(h('strong', 'agd-dw-steptitle', label));
      if (detail) text.appendChild(h('span', 'agd-dw-stepdetail', detail));
      li.appendChild(text);
      t.steps.appendChild(li);
      return li;
    }

    function completeSteps(t) {
      var running = t.steps.querySelectorAll('[data-s="run"]');
      for (var i = 0; i < running.length; i++) {
        var li = running[i];
        li.setAttribute('data-s', 'done');
        var ic = li.querySelector('.agd-dw-stepicon');
        ic.classList.remove('agd-k-spin');
        ic.textContent = '';
        ic.appendChild(icon('check'));
      }
    }

    function setCardSub(t, running, text) {
      t.cardSub.textContent = '';
      if (running) t.cardSub.appendChild(h('span', 'agd-k-spin agd-dw-cardspin'));
      t.cardSub.appendChild(h('span', null, text));
    }

    /* ------------------------------------------------------------ 근거 */

    function buildEvidenceCard(item, index) {
      var card = h('div', 'agd-dw-ev');
      card.setAttribute('data-i', index);
      var btn = h('div', 'agd-dw-evbtn');
      var kind = item.kind || 'PRE_MATERIAL';
      var tone = kind === 'ITEM_REFERENCE' || kind === 'TEAM_MATERIAL' ? ' is-primary' : '';
      btn.appendChild(h('span', 'agd-k-tag' + tone, LABEL.kind[kind] || kind));
      var text = h('span', 'agd-dw-evtext');
      text.appendChild(h('span', 'agd-dw-evname', item.name || ''));
      if (item.location) text.appendChild(h('span', 'agd-dw-evline', LABEL.evidence.location(item.location)));
      if (item.supports) text.appendChild(h('span', 'agd-dw-evline', LABEL.evidence.supports(item.supports)));
      btn.appendChild(text);
      card.caret = h('span', 'agd-dw-evcaret', '▾');
      btn.appendChild(card.caret);
      card.appendChild(btn);
      var quote = h('div', 'agd-dw-evquote');
      quote.appendChild(h('span', 'agd-dw-evquotetitle', LABEL.evidence.quote(item.location || null)));
      quote.appendChild(h('span', 'agd-dw-evquotetext', item.quote || ''));
      card.appendChild(quote);
      return card;
    }

    /* ------------------------------------------------------------ 처음 상태 */

    function build() {
      screen.textContent = '';
      el = {};
      st = {
        version: 1,
        format: '',
        turn: null,
        sec: 0,
        text: '',
        blanks: 0,
        blankMarks: [],
        suggestChips: [],
        blankChips: [],
        evCards: [],
        history: app.history || 0,
        appliedAt: null
      };

      root = h('div', 'agd-k agd-dw');
      root.appendChild(buildHead());
      buildBand();
      root.appendChild(el.band);
      root.appendChild(el.smStatus);
      var grid = h('div', 'agd-dw-grid');
      grid.appendChild(buildChat());
      grid.appendChild(buildEditor());
      grid.appendChild(buildSide());
      root.appendChild(grid);
      screen.appendChild(root);

      renderWelcome();
      setSend('send');
      setMeta('helper', LABEL.editor.metaEmpty);
      el.blankTag.style.display = 'none';
      el.tabHist.count.textContent = String(st.history);
      setBlockers(['empty']);
      setTab('att');
      // 시연 창이 원본보다 낮다 — 추천 칩이 보이게 환영 안내를 아래쪽부터
      el.msgs.scrollTop = el.msgs.scrollHeight;
    }

    /* ------------------------------------------------------------ 동작 */

    var actions = {
      /* 추천 칩을 눌러 보낸다 — 말풍선 · AI 차례(요청 이해 끝) · 초안 카드(작성 중) · 편집기 생성 상자 */
      suggest: function (a) {
        var text = (app.suggestions || [])[a.index || 0] || '';
        st.version = a.version || 1;
        st.format = a.format || '';
        el.msgs.textContent = '';
        st.suggestChips = [];
        el.msgs.appendChild(buildUserTurn(text));
        var t = buildAiTurn();
        addStep(t, LABEL.chat.understand, LABEL.chat.understandDraft, 'done');
        t.title.textContent = LABEL.chat.thinkRunning(LABEL.chat.understand);
        setCardSub(t, true, LABEL.chat.cardWriting);
        el.msgs.appendChild(t.el);
        st.turn = t;
        setSeconds(0);
        setSend('stop');

        root.setAttribute('data-turn', '');
        root.setAttribute('data-gen', '');
        el.genLines.textContent = '';
        el.genPhase.textContent = '';
        setMeta('running', LABEL.generation.chip(st.version));
        setBlockers(['running', 'empty']);
        setSmStatus('run', LABEL.chat.thinkRunning(LABEL.chat.understand));
        toBottom();
        return null;
      },

      /* 처리 과정 한 단계 — 앞 단계는 끝으로, 이 단계는 진행 중. phase = 편집기 생성 상자의 진행 문구 */
      step: function (a) {
        var t = st.turn;
        if (!t) return null;
        completeSteps(t);
        addStep(t, a.label, a.detail || null, 'run');
        t.title.textContent = LABEL.chat.thinkRunning(a.label);
        if (a.phase !== undefined) el.genPhase.textContent = a.phase;
        setSeconds(a.sec);
        setSmStatus('run', LABEL.chat.thinkRunning(a.label));
        toBottom();
        return null;
      },

      /* 편집기 생성 상자에 완성된 줄을 하나씩(빈 줄은 다음 줄과 함께). sec = [시작, 끝] 초 */
      write: function (a, ctx) {
        var lines = a.lines || [];
        var every = a.every || 520;
        var sec = a.sec || null;
        var i = 0;
        var caret = el.gen.querySelector('.agd-dw-caret') || h('span', 'agd-dw-caret agd-k-loop');

        function add() {
          var line = lineEl(lines[i]);
          i += 1;
          el.genLines.appendChild(line);
          line.appendChild(caret);
          if (sec && st.turn) setSeconds(Math.round(sec[0] + (sec[1] - sec[0]) * i / lines.length));
          U.reveal(el.edBody, line);
        }

        if (ctx.instant) {
          while (i < lines.length) add();
          return null;
        }
        function next() {
          if (i >= lines.length) return null;
          add();
          while (i < lines.length && lines[i - 1] === '') add();
          return ctx.sleep(every).then(next);
        }
        return next();
      },

      /* 적용 — 서버가 바로 적용한 최종 본문 · 버전 표시 · 글자 수 · [확인 필요] · 다음 할 일 · 저장 상태 · 제출 가능 */
      apply: function (a, ctx) {
        var text = a.text || '';
        var at = U.time.mdhm();
        st.appliedAt = at;
        st.text = text;
        st.blanks = countOf(text, BLANK);
        root.removeAttribute('data-gen');
        root.setAttribute('data-filled', '');
        renderEditorText(text);
        el.edBody.scrollTop = 0;
        setMeta('applied', LABEL.editor.metaApplied(st.version), LABEL.editor.generatedAt(at));
        el.chars.textContent = LABEL.editor.chars(U.nonSpaceLength(text));
        el.blankTag.textContent = LABEL.editor.blanks(st.blanks);
        el.blankTag.style.display = st.blanks > 0 ? '' : 'none';
        el.next.textContent = st.blanks > 0 ? LABEL.nextBlanks(st.blanks) : LABEL.nextWrite;
        el.save.setAttribute('data-save', 'saved');
        el.saveText.textContent = LABEL.saved(at);
        setBlockers([]);
        st.history += 1;
        el.tabHist.count.textContent = String(st.history);
        el.input.textContent = LABEL.chat.placeholderEdit;
        U.toast(screen, LABEL.generation.applied(st.version), { tone: 'success' }, ctx);
        return null;
      },

      /* 대화 차례 마무리 — 처리 과정 접힘 · 답(짧은 타자 효과) · 초안 카드 완료 · [확인 필요] 칩 · 이어서 할 요청 */
      finish: function (a, ctx) {
        var t = st.turn;
        if (!t) return null;
        completeSteps(t);
        var n = t.steps.querySelectorAll('.agd-dw-step').length;
        t.think.setAttribute('data-state', 'DONE');
        t.think.removeAttribute('data-open');
        t.thinkIcon.textContent = '';
        t.thinkIcon.appendChild(icon('check'));
        t.title.classList.remove('agd-k-loop');
        t.title.textContent = LABEL.chat.thinkDone(n);
        setSeconds(a.sec);
        setSmStatus('done', LABEL.chat.thinkDone(n) + ' · ' + LABEL.chat.seconds(st.sec));
        setCardSub(t, false, LABEL.chat.cardDone(U.nonSpaceLength(st.text), a.evidence || 0, st.blanks));
        setSend('send');

        var reply = String(a.reply || '');
        var box = h('div', 'agd-dw-md agd-dw-reply');
        t.body.insertBefore(box, t.card);

        function after() {
          box.classList.remove('is-caret');
          renderMd(box, reply);
          st.blankChips = [];
          var labels = [];
          for (var b = 0; b < st.blanks; b++) labels.push(LABEL.chat.blank(b + 1));
          if (labels.length) t.body.appendChild(chips(labels, 'is-warning agd-dw-blankchip', st.blankChips));
          t.body.appendChild(chips(app.followUps || [], 'agd-dw-sug'));
          showFrom(t.think);
          return null;
        }

        if (ctx.instant || reply === '') return after();
        // 원본처럼 길이와 상관없이 0.6초 안팎에 끝나게 여러 글자씩
        box.classList.add('is-caret');
        var ticks = 10;
        var per = Math.max(2, Math.ceil(reply.length / ticks));
        var shown = 0;
        function next() {
          shown = Math.min(reply.length, shown + per);
          renderMd(box, reply.slice(0, shown));
          showFrom(t.think);
          if (shown >= reply.length) return after();
          return ctx.sleep(60).then(next);
        }
        return next();
      },

      /* 오른쪽 패널을 근거 탭으로 · 메타 · 안내 · 근거 카드를 차례로 */
      evidence: function (a, ctx) {
        var items = a.items || [];
        el.paneEvid.textContent = '';
        st.evCards = [];
        el.paneEvid.appendChild(sectionTitle(LABEL.evidence.title));
        el.paneEvid.appendChild(h('p', 'agd-dw-helper agd-dw-evmeta', LABEL.evidence.meta(st.version, st.appliedAt || U.time.mdhm(), items.length)));
        if (st.blanks > 0) el.paneEvid.appendChild(h('div', 'agd-k-notice is-info agd-dw-evnotice', LABEL.evidence.partialBlanks));
        var list = h('div', 'agd-dw-evlist');
        el.paneEvid.appendChild(list);
        el.tabEvid.count.textContent = String(items.length);
        el.evTag.textContent = LABEL.editor.evidenceTag(items.length);
        root.setAttribute('data-evidence', '');
        setTab('evid');

        var i = 0;
        function add() {
          var card = buildEvidenceCard(items[i], i);
          list.appendChild(card);
          st.evCards.push(card);
          i += 1;
        }
        if (ctx.instant) {
          while (i < items.length) add();
          return null;
        }
        function next() {
          if (i >= items.length) return null;
          add();
          return ctx.sleep(a.stagger || 300).then(next);
        }
        return next();
      },

      /* 근거 카드를 펼친다(한 번에 하나) — 참고한 내용 */
      open: function (a) {
        var index = a.index || 0;
        st.evCards.forEach(function (card, i) {
          var on = i === index;
          card.classList.toggle('is-open', on);
          card.caret.textContent = on ? '▴' : '▾';
        });
        var target = st.evCards[index];
        if (target) U.reveal(el.sideScroll, target);
        return null;
      },

      /* [확인 필요] 칩 → 편집기 그 자리를 고른다(포커스 고리 + 선택 강조) */
      blank: function (a) {
        var index = a.index || 0;
        el.edBox.classList.add('is-focus');
        st.blankMarks.forEach(function (mark, i) {
          mark.classList.toggle('is-selected', i === index);
        });
        var mark = st.blankMarks[index];
        if (mark) U.reveal(el.edBody, mark);
        return null;
      }
    };

    function target(key) {
      var parts = String(key).split(':');
      var i = +parts[1] || 0;
      var node = null;
      if (parts[0] === 'suggest') node = st.suggestChips[i];
      else if (parts[0] === 'evidence') node = st.evCards[i];
      else if (parts[0] === 'blank') node = st.blankChips[i];
      if (!visible(node)) return null;
      if (parts[0] === 'evidence') U.reveal(el.sideScroll, node);
      else U.reveal(el.msgs, node);
      return node;
    }

    build();
    return { reset: build, target: target, actions: actions };
  }

  window.AgentDemo.registerRenderer('draft-workspace', { mount: mount });
})(window, document);
