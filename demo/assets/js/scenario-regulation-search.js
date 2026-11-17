/*
 * 시나리오 'regulation-search' — 규정 검색 AI (설계 0001 §3-2)
 * 화면 유형: rag-chat. 화면 문구는 원본 규정질의응답 화면을 따르고,
 * 규정명 · 조항 · 금액은 시연용 예시 데이터다.
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click)
 *   rag-chat: pick(index) · type(text, cps) · send · step(label, ms, dur, detail, open) ·
 *             evidence(items) · stream(text, cps) · finish(ms) · cite(n)
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  var TURN1_EVIDENCE = [
    {
      n: 1,
      kind: 'CHUNK',
      doc: '여비규정',
      where: '제3장 국내여비 › 제12조(숙박비)',
      page: 7,
      body:
        '① 국내 출장 중 숙박비는 별표 2에서 정한 상한액 범위에서 실제 쓴 금액을 지급한다.\n' +
        '② 숙박하지 않거나 숙박비를 쓰지 않은 경우에는 1박당 20,000원을 지급한다.'
    },
    {
      n: 2,
      kind: 'CHUNK',
      doc: '여비규정',
      where: '별표 2 국내 여비 지급표',
      page: 15,
      body: '숙박비(1박 상한) — 서울특별시 100,000원 · 광역시 80,000원 · 그 밖의 지역 70,000원'
    },
    {
      n: 3,
      kind: 'CHUNK',
      doc: '여비규정 시행세칙',
      where: '제8조(증빙서류)',
      page: 4,
      body: '숙박비를 청구할 때에는 숙박업소가 발행한 영수증 또는 신용카드 매출전표를 첨부한다.'
    }
  ];

  var TURN2_EVIDENCE = [
    {
      n: 1,
      kind: 'CHUNK',
      doc: '여비규정',
      where: '제2장 운임 › 제10조(자가용 운임)',
      page: 6,
      body:
        '자가용 승용차로 출장한 경우에는 연료비를 운임으로 지급한다.\n' +
        '연료비는 이동 거리에 유가를 곱한 금액을 연비로 나누어 계산한다.'
    },
    {
      n: 2,
      kind: 'TOOL',
      doc: '여비규정',
      where: '자가용 운임 계산',
      page: null,
      body: '120km × 1,800원/L ÷ 10km/L = 21,600원'
    }
  ];

  window.AgentDemo.registerScenario({
    id: 'regulation-search',
    order: 10,
    renderer: 'rag-chat',
    project: 'genai-work-platform',
    tab: { title: '규정 검색 AI' },
    summary:
      '사내 규정에서 근거 조항을 찾아 답하고, 답변 속 번호로 원문 근거를 바로 확인합니다. ' +
      '금액 계산이 필요한 질문은 계산 도구를 호출해 정확한 값을 냅니다.',
    points: ['근거 조항 인용', '처리 과정 공개', '계산 도구 호출'],
    // 방문자 설명(설계 0002 §3-6) — 업무 과제 · AI 에이전트의 해결 · 핵심 기능 · 시연 순서(각본의 chapter와 짝)
    intro: {
      problem: '출장비 · 휴가 · 수당처럼 자주 묻는 기준도 규정 본문과 별표를 오가며 직접 찾아야 하고, 금액은 따로 계산해야 합니다.',
      solution: '직원이 묻기만 하면 AI가 게시된 규정에서 관련 조항을 찾아 근거 번호와 함께 답하고, 금액이 필요한 질문은 계산 도구로 정확한 값을 냅니다.'
    },
    features: [
      { title: '근거 조항 인용', desc: '답변 속 번호를 누르면 그 내용이 나온 규정 원문과 쪽수를 바로 확인합니다.' },
      { title: '처리 과정 공개', desc: '질문 분석부터 원문 읽기까지 AI가 거친 단계를 그대로 보여 줘 결과를 믿고 쓸 수 있습니다.' },
      { title: '계산 도구 호출', desc: '운임 · 숙박비처럼 계산이 필요한 질문은 규정의 계산식으로 값을 구해 함께 보여 줍니다.' }
    ],
    chapters: [
      { title: '질문하기', caption: '직원이 예시 질문을 눌러 서울 출장 숙박비 기준을 묻습니다.' },
      { title: '규정 찾기', caption: 'AI가 질문을 분석해 관련 규정과 조항을 고르고 원문을 읽습니다.' },
      { title: '근거와 함께 답변', caption: '찾은 근거 3건을 오른쪽에 보여 주고, 근거 번호를 붙여 답을 씁니다.' },
      { title: '근거 확인', caption: '답변 속 번호를 누르면 그 근거 원문이 바로 강조됩니다.' },
      { title: '계산까지', caption: '자가용 운임처럼 계산이 필요한 질문은 계산 도구로 정확한 금액을 냅니다.' }
    ],
    hold: 4500,
    app: {
      windowTitle: 'AI 업무지원 포털 — 규정질의응답',
      brand: 'AI 업무지원',
      menus: [
        { label: '국회대응', icon: 'file' },
        { label: '규정검색', icon: 'book', active: true },
        { label: '공시작성', icon: 'chart' },
        { label: 'AI대화', icon: 'chat' }
      ],
      screenTitle: '규정질의응답',
      screenDesc: '게시된 사내 규정에서 근거를 찾아 답합니다. 답변은 AI 추천이며 근거 원문을 함께 확인하세요.',
      hero: {
        title: '무엇이든 물어보세요',
        desc: '규정의 기준 · 절차 · 금액을 물으면 근거 조항과 함께 답합니다.',
        examplesTitle: '이런 질문을 할 수 있어요',
        examples: [
          '배우자가 출산하면 휴가를 며칠 쓸 수 있나요?',
          '서울로 출장 가면 숙박비는 얼마까지 나오나요?',
          '가족수당은 배우자와 자녀 몇 명까지 얼마씩 받나요?',
          '감사 결과에 이의가 있으면 언제까지 재심의를 신청하나요?'
        ]
      },
      placeholder: '규정에 대해 물어보세요. 예: 자가용으로 왕복 120km 출장 가면 운임이 얼마예요?',
      hint: 'Enter 보내기 · Shift+Enter 줄바꿈 · 답변은 게시된 규정만 근거로 합니다'
    },
    script: [
      // 1~2. 시작 화면 → 예시 질문을 눌러 보내기
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1400 },
      { do: 'cursor', to: 'example:1', click: true },
      { do: 'pick', index: 1 },
      { do: 'cursor', to: 'send', click: true },
      { do: 'send' },
      { do: 'wait', ms: 300 },
      // 3~4. 처리 과정
      { do: 'chapter', n: 1 },
      { do: 'step', label: '질문 분석', ms: 412, dur: 650, detail: '검색어 2개 · 숙박비 · 서울' },
      { do: 'step', label: '규정 찾기', ms: 736, dur: 800, detail: '후보 규정 3건 중 여비규정 · 여비규정 시행세칙' },
      { do: 'step', label: '조항 고르기', ms: 1105, dur: 950, detail: '제12조(숙박비) · 별표 2 · 시행세칙 제8조' },
      { do: 'step', label: '원문 읽기', ms: 518, dur: 600, detail: '근거 3건 확인' },
      // 5. 근거 카드
      { do: 'chapter', n: 2 },
      { do: 'evidence', items: TURN1_EVIDENCE },
      // 6~7. 답 스트리밍 → 완료
      { do: 'step', label: '답변 작성', ms: 3620, open: true },
      {
        do: 'stream',
        cps: 38,
        text:
          '서울특별시 출장의 숙박비는 **1박당 100,000원 한도에서 실제 쓴 금액**을 지급합니다. [1] [2]\n' +
          '- 한도를 넘는 금액은 본인이 부담합니다. [1]\n' +
          '- 청구할 때 숙박업소 영수증이나 카드 매출전표를 첨부해야 합니다. [3]\n' +
          '- 숙박비를 쓰지 않았다면 1박당 **20,000원**을 정액으로 받습니다. [1]'
      },
      { do: 'finish', ms: 6400 },
      // 8. 인용 번호 → 근거 강조
      { do: 'wait', ms: 900 },
      { do: 'chapter', n: 3 },
      { do: 'cursor', to: 'cite:2', click: true },
      { do: 'cite', n: 2 },
      { do: 'wait', ms: 2200 },
      // 9~10. 계산 질문
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'input', click: true },
      { do: 'type', text: '자가용으로 왕복 120km 출장 가면 운임이 얼마예요?', cps: 14 },
      { do: 'cursor', to: 'send', click: true },
      { do: 'send' },
      { do: 'wait', ms: 300 },
      { do: 'step', label: '질문 분석', ms: 305, dur: 550, detail: '계산 질문 · 거리 120km' },
      { do: 'step', label: '규정 찾기', ms: 612, dur: 650, detail: '여비규정' },
      { do: 'step', label: '조항 고르기', ms: 884, dur: 750, detail: '제10조(자가용 운임) · 자가용 운임 계산 도구' },
      { do: 'step', label: '계산', ms: 46, dur: 700, detail: '자가용 운임(거리 120km · 유가 1,800원/L · 연비 10km/L)' },
      { do: 'step', label: '원문 읽기', ms: 402, dur: 500, detail: '근거 2건 확인' },
      { do: 'evidence', items: TURN2_EVIDENCE },
      { do: 'step', label: '답변 작성', ms: 1850, open: true },
      {
        do: 'stream',
        cps: 38,
        text:
          '왕복 120km면 자가용 운임은 **21,600원**입니다. [1] [2]\n' +
          '- 계산: 120km × 1,800원/L ÷ 10km/L = 21,600원 [2]\n' +
          '- 자가용 운임은 이동 거리에 유가를 곱하고 연비로 나눈 연료비로 지급합니다. [1]'
      },
      { do: 'finish', ms: 4100 },
      { do: 'wait', ms: 700 },
      { do: 'cursor', to: 'cite:2', click: true },
      { do: 'cite', n: 2 }
    ]
  });
})(window);
