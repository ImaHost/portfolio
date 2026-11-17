/*
 * 시나리오 'txhub-perf' — 클라우드 테스트 자동화(TaaS) 포털 · 성능 테스트 (포트폴리오 설계 0002 §3-3)
 * 화면 유형: txhub-portal. 화면 문구 · 배치는 포트폴리오 캡처를 따르고,
 * 고객사 · 워크스페이스 · 시나리오 · 요청 · 일시 · 수치는 모두 시연용 가상 데이터다.
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click)
 *   txhub-portal: pick(id) · type(text, every) · slide(field, to, ms) · throughput(value) · glide(to) · save · group · run ·
 *                 page(to) · filters · toggleNow · progress(ms) · dash(ms)
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  // 계약 크레딧(횟수 · 시간)과 지금까지 쓴 양 — 플랜 화면의 잔여 값과 대시보드가 같은 수에서 나온다
  var CONTRACT = { runs: 200, minutes: 2000 };
  var USED = { runs: 41, minutes: 386 };
  var PLAN = { name: '검색 API 2000명 기준', users: 2000, duration: 10, ramp: 3, throughput: 60 };

  window.AgentDemo.registerScenario({
    id: 'txhub-perf',
    order: 10,
    renderer: 'txhub-portal',
    project: 'txhub-portal',
    tab: { title: '성능 테스트' },
    summary:
      '성능 테스트를 시나리오 → 플랜 → 스케줄 → 결과 순서로 쌓고, 실행 결과와 계약 크레딧 대비 수행 현황을 대시보드에서 확인합니다.',
    points: ['시나리오 · 플랜 · 스케줄', '캘린더 조회', '크레딧 대비 수행 현황'],
    intro: {
      problem:
        '성능 테스트는 요청 묶음(시나리오), 부하 조건(플랜), 실행 시점(스케줄)을 따로 관리해야 하고, 고객사마다 계약한 크레딧(횟수 · 시간) 안에서만 실행해야 합니다.',
      solution:
        '포털에서 시나리오를 고르고 Vuser · Duration · Ramp-up으로 플랜을 만든 뒤 예약하거나 바로 실행하고, 실행 결과와 남은 크레딧을 같은 포털에서 확인합니다.'
    },
    features: [
      { title: '시나리오 · 플랜 · 스케줄', desc: '테스트를 네 단계로 쌓습니다. 시나리오 · 플랜 · 스케줄을 고르는 멀티셀렉트는 캘린더 · 대시보드가 함께 쓰는 공통 부품입니다.' },
      { title: '캘린더 조회', desc: '스케줄을 캘린더에서 고른 조건으로 모아 보고, 플랜마다 색을 달리해 일정을 구분합니다.' },
      { title: '크레딧 대비 수행 현황', desc: '총 수행 횟수 · 시간을 계약 크레딧과 견주고, 월별 성공 · 실패 · 취소를 차트로 봅니다.' }
    ],
    chapters: [
      { title: '시나리오 고르기', caption: '시나리오를 고르면 요청 목록(Think Time · method · url)이 열립니다.' },
      { title: '플랜 설정', caption: 'Vuser · Duration · Ramp up을 정해 저장하고 남은 크레딧을 확인합니다.' },
      { title: '스케줄 등록', caption: '스케줄 그룹에 예약을 넣고 바로 실행한 뒤, 캘린더에서 플랜별 색으로 일정을 확인합니다.' },
      { title: '실행 · 결과', caption: '방금 테스트가 실행 목록에 붙고 진행률과 상태(성공 · 실패 · 취소)가 보입니다.' },
      { title: '대시보드', caption: '계약 대비 수행 현황과 월별 테스트 현황이 방금 실행한 테스트까지 반영해 보입니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 고객사 · 시나리오 · 수치는 예시입니다.',
    hold: 4500,
    app: {
      windowTitle: 'TxHub — 성능 테스트',
      company: '○○테크',
      workspace: '검색 서비스팀',
      project: '통합 검색',
      scenarios: [
        { id: 23, name: '검색 API' },
        { id: 24, name: '메인 API' },
        { id: 25, name: 'OPEN API' },
        { id: 26, name: '로그인 API' },
        { id: 31, name: '장바구니 담기' },
        { id: 32, name: '주문 결제' }
      ],
      requests: [
        { name: '메인 진입', think: 1, method: 'GET', url: '/main' },
        { name: '검색어 조회', think: 2, method: 'GET', url: '/api/search?q={keyword}' },
        { name: '결과 상세', think: 1, method: 'GET', url: '/api/items/{id}' }
      ],
      plan: PLAN,
      credits: { runs: CONTRACT.runs - USED.runs, minutes: CONTRACT.minutes - USED.minutes },
      group: { name: '정기 점검', kind: '예약', when: '2026-11-19 14:00' },
      planColors: ['#5b5fe6', '#14b8a6'],
      filters: {
        scenarios: [{ label: '검색 API' }, { label: '메인 API' }],
        plans: [
          { label: PLAN.name, short: '검색 API 2000명', plan: 0 },
          { label: '메인 API 500명 기준', short: '메인 API 500명', plan: 1 }
        ],
        groups: [{ label: '정기 점검' }]
      },
      calendar: {
        y: 2026,
        m: 11,
        today: 17,
        from: '2026-11-01',
        to: '2026-12-31',
        events: [
          { day: 5, time: '10:00', label: '메인 API 500명 기준', plan: 1 },
          { day: 12, time: '10:00', label: '메인 API 500명 기준', plan: 1 },
          { day: 26, time: '10:00', label: '메인 API 500명 기준', plan: 1 },
          { day: 19, time: '14:00', label: PLAN.name, plan: 0, needsGroup: true },
          { day: 17, time: '14:00', label: '즉시 실행 · 검색 API', kind: 'now' }
        ]
      },
      runsRange: ['2026-11-01', '2026-11-17'],
      newRun: { name: '검색 API', kind: '즉시 실행', start: '2026. 11. 17. 오후 2:00:03', end: '2026. 11. 17. 오후 2:10:04' },
      runs: [
        { name: '메인 API', kind: '예약', start: '2026. 11. 12. 오전 10:00:01', end: '2026. 11. 12. 오전 10:05:02', progress: 100, status: 'complete' },
        { name: 'OPEN API', kind: '즉시 실행', start: '2026. 11. 10. 오후 4:12:40', end: '2026. 11. 10. 오후 4:14:05', progress: 35, status: 'cancel' },
        { name: '로그인 API', kind: '즉시 실행', start: '2026. 11. 9. 오후 1:30:12', end: '2026. 11. 9. 오후 1:36:47', progress: 72, status: 'fail' },
        { name: '메인 API', kind: '예약', start: '2026. 11. 5. 오전 10:00:02', end: '2026. 11. 5. 오전 10:05:01', progress: 100, status: 'complete' }
      ],
      dashboard: {
        // 방금 실행(1회 · 10분)까지 더한 값
        tiles: [
          { label: '총 수행횟수', value: USED.runs + 1, of: CONTRACT.runs },
          { label: '총 수행 시간(분)', value: USED.minutes + PLAN.duration, of: CONTRACT.minutes },
          { label: '예약 횟수', value: 1 },
          { label: '예약 시간(분)', value: PLAN.duration }
        ],
        count: {
          max: 12,
          months: ['202606', '202607', '202608', '202609', '202610', '202611'],
          s: [3, 6, 2, 8, 5, 3],
          f: [1, 1, 0, 1, 1, 1],
          c: [0, 1, 0, 1, 0, 1],
          r: [0, 0, 0, 0, 0, 1]
        },
        minutes: {
          max: 100,
          months: ['202606', '202607', '202608', '202609', '202610', '202611'],
          s: [30, 60, 20, 80, 50, 20],
          f: [6, 10, 0, 8, 10, 7],
          c: [0, 3, 0, 2, 0, 1],
          r: [0, 0, 0, 0, 0, 10]
        }
      }
    },
    script: [
      // 1. 시나리오 조회 — 행을 고르면 시나리오 · 플랜 화면
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1500 },
      { do: 'cursor', to: 'row:23', click: true },
      { do: 'pick', id: 23 },
      { do: 'wait', ms: 900 },
      // 2. 플랜 — 이름 · 슬라이더 · Throughput · 저장
      { do: 'chapter', n: 1 },
      { do: 'cursor', to: 'field:planName', click: true },
      { do: 'type', text: PLAN.name, every: 55 },
      { do: 'slide', field: 'users', to: PLAN.users, ms: 1000 },
      { do: 'slide', field: 'duration', to: PLAN.duration, ms: 650 },
      { do: 'slide', field: 'ramp', to: PLAN.ramp, ms: 550 },
      { do: 'throughput', value: PLAN.throughput },
      { do: 'wait', ms: 500 },
      { do: 'glide', to: 'save' },
      { do: 'cursor', to: 'save', click: true },
      { do: 'save' },
      { do: 'wait', ms: 800 },
      // 3. 스케줄 그룹 예약 · 바로 실행 → 캘린더
      { do: 'chapter', n: 2 },
      { do: 'glide', to: 'group-add' },
      { do: 'cursor', to: 'group-add', click: true },
      { do: 'group' },
      { do: 'wait', ms: 600 },
      { do: 'glide', to: 'run' },
      { do: 'cursor', to: 'run', click: true },
      { do: 'run' },
      { do: 'wait', ms: 800 },
      { do: 'cursor', to: 'subtab:schedule', click: true },
      { do: 'page', to: 'cal' },
      { do: 'filters' },
      { do: 'wait', ms: 700 },
      { do: 'cursor', to: 'toggle:now', click: true },
      { do: 'toggleNow' },
      { do: 'wait', ms: 1500 },
      // 4. Runs — 방금 실행이 Complete까지
      { do: 'chapter', n: 3 },
      { do: 'page', to: 'runs' },
      { do: 'wait', ms: 500 },
      { do: 'progress', ms: 2400 },
      { do: 'cursor', to: 'result:new' },
      { do: 'wait', ms: 1300 },
      // 5. 대시보드 — 계약 대비 수행 현황 · 월별 현황
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'subtab:all', click: true },
      { do: 'page', to: 'dash' },
      { do: 'dash', ms: 1500 },
      { do: 'wait', ms: 2200 }
    ]
  });
})(window);
