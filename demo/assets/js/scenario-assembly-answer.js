/*
 * 시나리오 'assembly-answer' — 국회 대응 AI (설계 0002 §3-2)
 * 화면 유형: draft-workspace. 화면 문구는 원본 답변 작성 창을 따르고,
 * 요구서 · 의원실 · 부서 · 자료명 · 수치는 모두 시연용 가상 데이터다.
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click)
 *   draft-workspace: suggest(index, version, format) · step(label, phase, sec) · write(lines, every, sec) ·
 *                    apply(text) · finish(sec, reply, evidence) · evidence(items, stagger) · open(index) · blank(index)
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  var BLANK = '[확인 필요]';

  // 답변서 기본 틀(개조식) — 본문에 인용 번호를 넣지 않는다
  var DRAFT_LINES = [
    '□ 에너지 효율 진단 지원 실적(2023~2025년)',
    'ㅇ 입주기업의 에너지 사용 현황을 진단하고 개선 과제를 제시하는 사업임',
    'ㅇ 2023년 지원 기업 84개사, 지원 금액 12.6억 원',
    'ㅇ 2024년 지원 기업 97개사, 지원 금액 14.1억 원',
    'ㅇ 2025년 지원 기업 112개사, 지원 금액 16.3억 원',
    '※ 2025.12월 말 기준',
    '',
    '□ 2026년 추진 계획',
    'ㅇ 지원 대상을 130개사로 확대 추진 예정',
    'ㅇ 2026년 지원 예산: ' + BLANK
  ];
  var DRAFT = DRAFT_LINES.join('\n');

  var EVIDENCE = [
    {
      kind: 'PRE_MATERIAL',
      name: '입주기업 지원사업 현황(2026.01).pdf',
      location: 'p.14 〈표 5〉 에너지 효율 진단 지원 실적',
      supports: '연도별 지원 기업 수, 지원 금액',
      quote:
        '구분 | 2023 | 2024 | 2025\n' +
        '지원 기업(개사) | 84 | 97 | 112\n' +
        '지원 금액(억 원) | 12.6 | 14.1 | 16.3\n' +
        '※ 2025.12월 말 기준'
    },
    {
      kind: 'ITEM_REFERENCE',
      name: '2026 에너지 효율 진단 지원 계획(안).pdf',
      location: 'p.3 Ⅱ. 추진 방향',
      supports: '2026년 지원 대상 확대',
      quote: '2026년에는 지원 대상을 130개사로 확대하여 추진할 예정임(소요 예산은 관계 부서와 협의 중)'
    },
    {
      kind: 'HISTORY_ANSWER',
      name: '질의답변이력 · 2025002871 · 요구사항 4',
      location: '요구사항 4',
      supports: '사업 개요',
      quote: 'ㅇ 입주기업의 에너지 사용 현황을 진단하고 개선 과제를 제시하는 사업임'
    }
  ];

  function countOf(text, word) {
    return text.split(word).length - 1;
  }

  // 원본 서버 답 문장(초안 생성 · 기본 틀)
  var BLANKS = countOf(DRAFT, BLANK);
  var REPLY =
    '기본 틀로 초안을 편집기에 작성했습니다(초안 v1).\n' +
    '- 근거 ' + EVIDENCE.length + '건을 사용했습니다.' +
    (BLANKS > 0 ? '\n- 근거를 찾지 못한 곳 **' + BLANKS + '곳**은 ' + BLANK + '로 비워 두었습니다.' : '');

  window.AgentDemo.registerScenario({
    id: 'assembly-answer',
    order: 20,
    renderer: 'draft-workspace',
    project: 'genai-work-platform',
    tab: { title: '국회 대응 AI' },
    summary:
      '국회 요구자료에 대해 고른 자료에서 근거를 찾아 공단 답변서 문체로 초안을 편집기에 바로 작성합니다. ' +
      '근거를 찾지 못한 곳은 [확인 필요]로 남겨 담당자가 확인합니다.',
    points: ['답변서 문체 초안', '근거 카드', '[확인 필요] 표시'],
    // 방문자 설명(설계 0002 §3-6) — 업무 과제 · AI 에이전트의 해결 · 핵심 기능 · 시연 순서(각본의 chapter와 짝)
    intro: {
      problem: '국회 요구자료는 짧은 기한 안에 여러 자료에서 수치를 찾아 확인하고, 공단 답변서 문체로 정리해야 합니다.',
      solution: '담당자가 \'초안 만들어 줘\'라고 요청하면 AI가 고른 자료에서 근거를 찾아 개조식 답변 초안을 편집기에 바로 씁니다. 근거가 없는 값은 지어내지 않고 [확인 필요]로 남깁니다.'
    },
    features: [
      { title: '답변서 문체 초안', desc: '□ · ㅇ 개조식 답변서 형식 그대로 편집기에 작성해, 담당자는 다듬기만 하면 됩니다.' },
      { title: '근거 카드', desc: '초안에 쓴 수치가 어느 자료의 어느 위치에서 왔는지 근거 카드로 정리합니다.' },
      { title: '[확인 필요] 표시', desc: '근거를 찾지 못한 값은 비워 두고 표시해 사람이 직접 확인하게 합니다.' }
    ],
    chapters: [
      { title: '초안 요청', caption: '담당자가 대화창에서 \'초안 만들어 줘\'를 누릅니다.' },
      { title: '근거 검색', caption: 'AI가 고른 자료에서 요구사항에 맞는 근거를 찾습니다.' },
      { title: '초안 작성', caption: '편집기에 개조식 답변이 한 줄씩 작성되고, 근거 없는 값은 [확인 필요]로 남습니다.' },
      { title: '근거 확인', caption: '사용한 근거 3건이 카드로 정리되고, 카드를 펼치면 원문 내용이 보입니다.' },
      { title: '사람이 확인', caption: '[확인 필요]를 누르면 편집기에서 그 자리로 이동해 담당자가 직접 채웁니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 자료 · 수치는 예시입니다.',
    hold: 4500,
    app: {
      windowTitle: 'AI 업무지원 포털 — 나의대응업무 · 답변 작성',
      aiName: 'AI 업무지원',
      user: '담당자',
      inquiry: {
        number: '2026004217',
        itemNo: '03',
        agency: '○○○ 의원실',
        requirement:
          '최근 3년간(2023~2025년) 산업단지 입주기업 에너지 효율 진단 지원 실적(연도별 지원 기업 수 · 지원 금액)과 2026년 추진 계획'
      },
      facts: { requester: '○○협력팀', dept: '○○사업팀' },
      sources: [
        { kind: 'PRE_MATERIAL', name: '입주기업 지원사업 현황(2026.01)' },
        { kind: 'ITEM_REFERENCE', name: '2026 에너지 효율 진단 지원 계획(안).pdf' }
      ],
      suggestions: ['초안 만들어 줘', '표로 정리해 줘', '서술식으로 써 줘'],
      followUps: ['서술식으로 바꿔 줘', '표로 정리해 줘', '더 짧게 줄여 줘', '근거 알려 줘'],
      history: 1
    },
    script: [
      // 1. 처음 화면 — 환영 안내 · 추천 칩, 빈 편집기, 제출 첨부 탭
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 3000 },
      // 2. 추천 칩 "초안 만들어 줘" → 처리 과정 시작 · 편집기 생성 상자
      { do: 'cursor', to: 'suggest:0', click: true },
      { do: 'suggest', index: 0, version: 1, format: '기본 틀' },
      { do: 'chapter', n: 1 },
      { do: 'step', label: '근거 검색', phase: '자료 확인', sec: 0 },
      { do: 'wait', ms: 2400 },
      // 3. 초안 작성 — 첫 묶음이 줄 단위로
      { do: 'chapter', n: 2 },
      { do: 'step', label: '초안 작성', phase: '작성 중', sec: 2 },
      { do: 'write', lines: DRAFT_LINES.slice(0, 5), every: 700, sec: [2, 5] },
      // 4. 문장 확인 — 나머지 줄 · 마지막 줄 [확인 필요]
      { do: 'step', label: '문장 확인', phase: '근거 확인', sec: 6 },
      { do: 'write', lines: DRAFT_LINES.slice(5), every: 700, sec: [6, 8] },
      { do: 'wait', ms: 500 },
      // 5. 적용 — 최종 본문 · 글자 수 · [확인 필요] 표시 · 저장 상태 · 답변제출 활성
      { do: 'apply', text: DRAFT },
      { do: 'wait', ms: 1400 },
      // 6. 마무리 — 처리 과정 접힘 · 답 · 초안 카드 완료 · 칩
      { do: 'finish', sec: 9, reply: REPLY, evidence: EVIDENCE.length },
      { do: 'wait', ms: 1600 },
      // 7. 근거 탭으로 전환 · 근거 카드
      { do: 'chapter', n: 3 },
      { do: 'evidence', items: EVIDENCE, stagger: 300 },
      { do: 'wait', ms: 2800 },
      // 8. 근거 카드 펼침
      { do: 'cursor', to: 'evidence:0', click: true },
      { do: 'open', index: 0 },
      { do: 'wait', ms: 2800 },
      // 9. [확인 필요] 칩 → 편집기 그 자리 선택
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'blank:0', click: true },
      { do: 'blank', index: 0 },
      { do: 'wait', ms: 2800 }
    ]
  });
})(window);
