/*
 * 시나리오 'kcomwel-opinion' — 근로복지공단 AI 재해조사 어시스턴트 · 심사의견서(포트폴리오 설계 0003 §3-2)
 * 화면 유형: kcomwel-opinion. 1단계(청구 개요)의 표는 시험 환경 캡처(review-opinion)의 더미 값 그대로다.
 * 접수번호는 불승인공문 사례와 같은 MOCK-UI-0002로 둔다 — 심사청구는 불승인 처분에 대한 불복이라서.
 * 2~5단계는 캡처 밖이라 같은 틀로 재구성했다. 왼쪽 표는 캡처 · 불승인공문 사례에 이미 나온 값만 다시 쓰고,
 * 오른쪽 본문 문장은 시연용 예시다.
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click) · chapter(n)
 *   kcomwel-opinion: type(text, every) · generate(ms, every, write, tick) · focus(pane) · step(index) ·
 *                    edit(append, every) · save · copy · scrollPreview(index) · print
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  var RECEIPT = 'MOCK-UI-0002';
  var CONCLUSION = 4;
  var APPEND = ' 관련 법령: 산업재해보상보험법 제37조, 같은 법 시행령 제34조.';

  window.AgentDemo.registerScenario({
    id: 'kcomwel-opinion',
    order: 30,
    renderer: 'kcomwel-opinion',
    project: 'kcomwel-ai-assistant',
    tab: { title: '심사의견서' },
    summary:
      '심사청구 건의 심사의견서를 청구 개요부터 결론까지 단계별로 AI가 작성합니다. ' +
      '단계마다 시스템에서 가져온 조회 데이터와 작성용 본문을 나눠 보여 줍니다.',
    points: ['6단계 작성 흐름', '조회 데이터 · 본문 분리', '미리보기 · 인쇄'],
    intro: {
      problem: '심사의견서는 청구인 · 대리인 · 원처분 정보를 옮겨 적고, 청구인 주장과 공단 의견을 정리해 결론까지 긴 문서를 써야 합니다.',
      solution: '접수번호로 생성을 누르면 AI가 단계별 초안을 만들고, 담당자는 단계 표시줄로 오가며 조회 데이터와 본문을 대조해 고칩니다.'
    },
    features: [
      { title: '단계형 작성', desc: '청구 개요부터 미리보기까지 6단계를 표시줄로 보여 주고, 완료된 단계는 체크로 표시합니다.' },
      { title: '조회 데이터와 본문 분리', desc: '시스템에서 가져온 데이터는 왼쪽, AI가 쓴 본문은 오른쪽에 둬 원천 데이터를 실수로 고치지 않게 했습니다.' },
      { title: '단계 단위 수정 · 복사', desc: '단계별 본문만 고치거나 복사하고, 고친 내용이 들어간 의견서를 미리 보고 인쇄합니다.' }
    ],
    chapters: [
      { title: '의견서 생성', caption: '접수번호로 [심사의견서 생성]을 누르면 6단계 초안이 차례로 만들어집니다.' },
      { title: '조회 · 작성 분리', caption: '왼쪽은 시스템에서 가져온 조회 데이터, 오른쪽은 AI가 쓴 작성용 본문입니다.' },
      { title: '단계별 확인', caption: '단계 표시줄로 청구 경위 · 청구인 주장 · 피청구인 의견을 차례로 봅니다.' },
      { title: '결론 수정', caption: '결론 본문에 담당자가 [수정]으로 관련 법령을 덧붙이고 저장합니다.' },
      { title: '미리보기', caption: '고친 내용이 들어간 심사의견서를 미리 보고 바로 인쇄합니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 청구인 · 대리인 · 사업장 정보는 모두 시험용 더미 데이터입니다.',
    hold: 4500,
    app: {
      windowTitle: 'AI 재해조사 어시스턴트 — 심사의견서',
      product: 'AI 재해조사 어시스턴트',
      menus: ['AI어시스턴스', 'AI업무가이드', '재해조사보고서', '불승인공문', '심사의견서'],
      activeMenu: 4,
      pageTitle: '심사의견서',
      receiptNo: RECEIPT,
      runLabel: '심사의견서 생성',
      sectionTitle: 'AI 심사의견서',
      // source: 묶음 { group, rows } 또는 한 줄 [라벨, 값]. 마지막 단계는 미리보기
      steps: [
        {
          label: '청구 개요',
          source: [
            { group: '청구인\n(원처분을 받은 자)', rows: [['성명', '홍길동'], ['주소', '서울특별시 중구 세종대로 110'], ['전화번호', '010-1234-5678']] },
            { group: '대리인', rows: [['성명', '대리인김'], ['주소', '서울특별시 종로구 1'], ['전화번호', '02-111-2222'], ['관계', '배우자']] },
            { group: '재해자', rows: [['성명', '홍길동'], ['주소', '서울특별시 중구 세종대로 110'], ['전화번호', '010-1234-5678']] },
            { group: '재해발생\n사업장', rows: [['사업장명', '목업건설(주)'], ['소재지', '서울특별시 강남구 테헤란로 1']] },
            ['처분년월일', '2025-08-20'],
            ['처분이 있음을 안 날', '2025-08-22'],
            ['심사청구 고지유무', '통지완료']
          ],
          text: '청구인 홍길동은 2025. 8. 20.자 요양급여 불승인 처분에 불복하여, 배우자인 대리인을 통해 심사를 청구하였습니다.'
        },
        {
          label: '청구 경위',
          source: [
            ['원처분 내용', '요양급여 불승인'],
            ['처분년월일', '2025-08-20'],
            ['처분이 있음을 안 날', '2025-08-22'],
            ['심사청구 고지유무', '통지완료']
          ],
          text: '공단은 청구인의 요양급여 신청에 대해 2025. 8. 20. 불승인 처분을 하였고, 청구인은 2025. 8. 22. 처분이 있음을 알고 심사를 청구하였습니다.'
        },
        {
          label: '청구인 주장',
          source: [
            ['청구 취지', '원처분 취소'],
            ['청구 이유', '장기간 반복한 업무로 상병이 발생하였음'],
            ['대리인', '대리인김 (배우자)']
          ],
          text: '청구인은 장기간 반복해 온 업무 때문에 상병이 발생하였으므로 업무관련성을 인정해야 한다고 주장합니다.'
        },
        {
          label: '피청구인 의견',
          source: [
            ['원처분 사유', '업무와 상병 사이의 상당인과관계를 인정하기 어려움'],
            ['판단 자료', '진료기록, 사업장 조사서, 신청인 진술서'],
            ['관련 법령', '산업재해보상보험법 제37조, 같은 법 시행령 제34조']
          ],
          text: '공단은 진료기록 · 사업장 조사서 · 신청인 진술서를 검토한 결과, 업무와 상병 사이의 상당인과관계를 인정하기 어려워 원처분이 정당하다는 의견입니다.'
        },
        {
          label: '결론',
          source: [
            ['청구 취지', '원처분 취소'],
            ['쟁점', '업무와 상병 사이의 상당인과관계'],
            ['피청구인 의견', '원처분 유지']
          ],
          text: '청구인의 주장과 제출 자료만으로는 원처분 사유를 뒤집기 어려우므로, 원처분을 유지함이 타당하다는 의견입니다.'
        },
        { label: '미리보기' }
      ],
      preview: {
        title: '심사의견서 미리보기',
        docTitle: '심사의견서',
        meta: ['접수번호', RECEIPT]
      }
    },
    script: [
      // 1. 의견서 생성 — 1단계가 채워지고 나머지 단계가 차례로 체크
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1100 },
      { do: 'cursor', to: 'receipt', click: true },
      { do: 'type', text: RECEIPT, every: 60 },
      { do: 'wait', ms: 300 },
      { do: 'cursor', to: 'run', click: true },
      { do: 'generate', ms: 500, every: 55, write: 30, tick: 380 },
      { do: 'wait', ms: 900 },
      // 2. 조회 데이터 | 작성용 본문
      { do: 'chapter', n: 1 },
      { do: 'cursor', to: 'source' },
      { do: 'focus', pane: 'source' },
      { do: 'wait', ms: 1600 },
      { do: 'cursor', to: 'draft' },
      { do: 'focus', pane: 'draft' },
      { do: 'wait', ms: 1600 },
      { do: 'focus' },
      // 3. 단계 이동
      { do: 'chapter', n: 2 },
      { do: 'cursor', to: 'step:1', click: true },
      { do: 'step', index: 1 },
      { do: 'wait', ms: 1500 },
      { do: 'cursor', to: 'step:2', click: true },
      { do: 'step', index: 2 },
      { do: 'wait', ms: 1500 },
      { do: 'cursor', to: 'step:3', click: true },
      { do: 'step', index: 3 },
      { do: 'wait', ms: 1800 },
      // 4. 결론 수정
      { do: 'chapter', n: 3 },
      { do: 'cursor', to: 'step:' + CONCLUSION, click: true },
      { do: 'step', index: CONCLUSION },
      { do: 'wait', ms: 900 },
      { do: 'cursor', to: 'edit', click: true },
      { do: 'edit', append: APPEND, every: 40 },
      { do: 'wait', ms: 400 },
      { do: 'cursor', to: 'save', click: true },
      { do: 'save' },
      { do: 'wait', ms: 1500 },
      // 5. 미리보기 · 인쇄
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'step:5', click: true },
      { do: 'step', index: 5 },
      { do: 'wait', ms: 1200 },
      { do: 'scrollPreview', index: CONCLUSION },
      { do: 'wait', ms: 1300 },
      { do: 'cursor', to: 'print', click: true },
      { do: 'print' },
      { do: 'wait', ms: 2200 }
    ]
  });
})(window);
