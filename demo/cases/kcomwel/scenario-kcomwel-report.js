/*
 * 시나리오 'kcomwel-report' — 근로복지공단 AI 재해조사 어시스턴트 · 재해조사보고서(포트폴리오 설계 0002 §3-2)
 * 화면 유형: kcomwel-assist. 화면 문구 · 구조는 시험 환경 캡처(재해정보 조회 · 조사 결과 · 미리보기)를 따르고,
 * 재해자 · 사업장 · 진료 정보는 캡처에 있는 시험용 더미 데이터(MOCK-UI-0001 · 불승인공문은 MOCK-UI-0002)만 쓴다.
 * AI 가이드의 설명 · 참조 문구는 시연용 예시다(캡처의 가이드 칸은 목업 문구라 그대로 옮기지 않았다).
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click) · chapter(n)
 *   kcomwel-assist: type(text, every) · lookup(ms, every) · generate(every, gap) · guide(index) ·
 *                   edit(index, append, every) · save(index) · copy(index) · preview · scrollPreview(index) · print
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  var RECEIPT = 'MOCK-UI-0001';
  // 불승인공문 사례는 다른 더미 건으로 둔다 — 같은 접수번호가 보고서(인정)와 공문(불승인)에 같이 나오면 모순으로 보인다
  var RECEIPT_REJECT = 'MOCK-UI-0002';
  var EDIT_INDEX = 1;
  var EDIT_APPEND = ' 신청인은 건설업 사업장에서 5년 3개월간 근무하였습니다.';

  window.AgentDemo.registerScenario({
    id: 'kcomwel-report',
    order: 10,
    renderer: 'kcomwel-assist',
    project: 'kcomwel-ai-assistant',
    tab: { title: '재해조사보고서' },
    summary:
      '접수번호 하나로 접수 데이터를 불러오고, AI가 재해조사보고서의 조사 결과를 항목별로 작성합니다. ' +
      '담당자는 항목 옆 AI 가이드를 보며 고치고, 재해조사서 서식으로 미리 보고 인쇄합니다.',
    points: ['항목별 AI 초안', 'AI 가이드(설명 · 참조)', '미리보기 · 인쇄'],
    intro: {
      problem:
        '재해조사보고서는 접수 데이터 · 진료 기록 · 관련 법령을 오가며 신청 내용부터 인정사실까지 여러 항목을 담당자가 직접 정리해야 합니다.',
      solution:
        '접수번호를 넣으면 접수 데이터를 불러와 AI가 항목마다 초안을 쓰고, 옆에 AI 가이드(설명 · 참조)를 붙입니다. 담당자는 근거를 보며 항목 단위로 고치거나 복사합니다.'
    },
    features: [
      { title: 'AI 초안과 근거를 나란히', desc: '항목마다 오른쪽에 AI 가이드(설명 · 참조)를 붙여, 어디서 온 내용인지 보고 고칩니다.' },
      { title: '항목 단위 수정 · 복사', desc: '문서 전체를 다시 생성하지 않고 항목 하나만 고치거나 기존 업무 시스템에 붙여 넣습니다.' },
      { title: '단계 표시 · 미리보기', desc: '재해정보 조회 → 조사 결과 2단계를 표시줄로 보여 주고, 완성본을 실제 서식으로 미리 보고 인쇄합니다.' }
    ],
    chapters: [
      { title: '접수 조회', caption: '접수번호를 넣고 [재해조사보고서 작성]을 누르면 접수 데이터를 불러옵니다.' },
      { title: 'AI 초안 생성', caption: '신청 내용 · 신청인 주장 · 의학적 소견 · 인정사실을 AI가 항목별로 씁니다.' },
      { title: '근거 보며 수정', caption: '항목 옆 AI 가이드의 설명 · 참조를 보고, 담당자가 [수정]으로 문장을 직접 고칩니다.' },
      { title: '항목 복사', caption: '문서 전체를 다시 만들지 않고 항목 하나만 복사해 기존 업무 시스템에 붙여 넣습니다.' },
      { title: '미리보기', caption: '완성본을 재해조사서 서식으로 미리 보고 바로 복사 · 인쇄합니다. 고친 문장도 그대로 들어갑니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 재해자 · 사업장 정보는 모두 시험용 더미 데이터입니다.',
    hold: 4500,
    app: {
      windowTitle: 'AI 재해조사 어시스턴트 — 재해조사보고서',
      product: 'AI 재해조사 어시스턴트',
      menus: ['AI어시스턴스', 'AI업무가이드', '재해조사보고서', '불승인공문', '심사의견서'],
      activeMenu: 2,
      pageTitle: '재해조사보고서',
      receiptNo: RECEIPT,
      runLabel: '재해조사보고서 작성',
      sectionTitle: 'AI 생성보고서',
      steps: ['재해정보 조회', '조사 결과'],
      intakeTitle: '접수 데이터',
      // [라벨, 값, 라벨, 값] 또는 한 줄 전체 [라벨, 값] — 캡처(report-intake)의 더미 값
      intake: [
        ['접수일자', '2025-09-01', '재해발생일시', '2025-08-15 09:30'],
        ['재해자 성명', '홍길동', '사업장명', '목업건설(주)'],
        ['업종명', '건설업 (40001)', '근무경력', '5년 3개월'],
        ['신청 구분', '업무상 질병 (02)'],
        ['재해 발생경위', '작업 중 어깨에 무리한 힘이 가해져 통증 발생'],
        ['신청상병', 'M75.1 회전근개파열'],
        ['환자호소증상', '우측 어깨 통증 및 거상 제한'],
        ['종합소견', '우측 회전근개 파열 소견']
      ],
      // 조사 결과 항목 — 초안 문장은 캡처(report-result · report-preview) 그대로
      items: [
        {
          title: '신청 내용',
          previewLabel: '신청내용',
          text: '신청인은 업무 수행 중 어깨 부상을 입고 요양을 신청하였습니다.',
          guide: {
            desc: '접수 데이터의 신청 구분과 재해 발생경위를 바탕으로 신청 내용을 정리했습니다.',
            ref: '접수 데이터 — 신청 구분 · 재해 발생경위'
          }
        },
        {
          title: '신청인 주장',
          previewLabel: '신청인 주장',
          text: '신청인은 반복적인 어깨 사용 업무로 인해 상병이 발생하였다고 주장합니다.',
          guide: {
            desc: '주장의 배경이 되는 업종과 근무경력을 함께 적으면 업무관련성 판단에 도움이 됩니다.',
            ref: '접수 데이터 — 업종명 · 근무경력(5년 3개월)'
          }
        },
        {
          title: '진료기록 및 의학적 소견',
          previewLabel: '진료기록 및 의학적 소견',
          text: 'MRI 상 우측 회전근개 파열 소견이 확인됩니다.',
          guide: {
            desc: '진료 기록의 종합소견과 신청상병을 의학적 소견으로 정리했습니다.',
            ref: '진료 기록 — 종합소견 · 신청상병(M75.1)'
          }
        },
        {
          title: '인정사실',
          previewLabel: '인정사실(사실관계 조사결과)',
          text: '신청인의 담당 업무와 상병 발생 시기 · 양상을 고려할 때 업무관련성이 인정됩니다.',
          guide: {
            desc: '업무상 재해의 인정기준과 업무관련성 판단기준에 비추어 인정사실을 정리했습니다.',
            ref: '산업재해보상보험법 제37조 · 같은 법 시행령 제34조'
          }
        }
      ],
      preview: {
        title: '재해조사서 미리보기',
        docTitle: '재해조사서(질병)',
        heading: '7. 조사결과',
        sub: '가. 사실관계에 대하여'
      }
    },
    script: [
      // 1. 접수 조회
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1200 },
      { do: 'cursor', to: 'receipt', click: true },
      { do: 'type', text: RECEIPT, every: 60 },
      { do: 'wait', ms: 350 },
      { do: 'cursor', to: 'run', click: true },
      { do: 'lookup', ms: 900, every: 90 },
      { do: 'wait', ms: 1800 },
      // 2. AI 초안 생성 — 2단계 조사 결과
      { do: 'chapter', n: 1 },
      { do: 'generate', every: 40, gap: 350 },
      { do: 'wait', ms: 1400 },
      // 3. 가이드를 보며 수정
      { do: 'chapter', n: 2 },
      { do: 'cursor', to: 'guide:' + EDIT_INDEX },
      { do: 'guide', index: EDIT_INDEX },
      { do: 'wait', ms: 1600 },
      { do: 'cursor', to: 'edit:' + EDIT_INDEX, click: true },
      { do: 'edit', index: EDIT_INDEX, append: EDIT_APPEND, every: 45 },
      { do: 'wait', ms: 500 },
      { do: 'cursor', to: 'save:' + EDIT_INDEX, click: true },
      { do: 'save', index: EDIT_INDEX },
      { do: 'wait', ms: 1600 },
      // 4. 항목 복사
      { do: 'chapter', n: 3 },
      { do: 'cursor', to: 'copy:0', click: true },
      { do: 'copy', index: 0 },
      { do: 'wait', ms: 2000 },
      // 5. 미리보기 · 인쇄
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'preview', click: true },
      { do: 'preview' },
      { do: 'wait', ms: 1300 },
      { do: 'scrollPreview', index: EDIT_INDEX },
      { do: 'wait', ms: 1500 },
      { do: 'cursor', to: 'print', click: true },
      { do: 'print' },
      { do: 'wait', ms: 2200 }
    ]
  });

  /*
   * 시나리오 'kcomwel-rejection' — 불승인공문(같은 렌더러, 단계 표시 · 접수 데이터 표 없음)
   * 항목 · 초안 문장 · 미리보기 서식은 캡처(rejection-letter · rejection-preview) 그대로,
   * 결정 사유에 덧붙이는 문장은 AI업무가이드 캡처의 추천 절차(업무상 질병판정위원회 심의)를 근거로 한 예시다.
   */
  var REJ_EDIT = 4;
  var REJ_APPEND = ' 업무상 질병판정위원회 심의 결과를 반영하였습니다.';

  window.AgentDemo.registerScenario({
    id: 'kcomwel-rejection',
    order: 20,
    renderer: 'kcomwel-assist',
    project: 'kcomwel-ai-assistant',
    tab: { title: '불승인공문' },
    summary:
      '불승인 결정이 난 건의 공문을 항목별로 AI가 작성합니다. 신청 내용 · 관련 법령 · 판단 자료 · 결정 내용 · 결정 사유를 쓰고, ' +
      '담당자는 가이드를 보며 고친 뒤 공문 서식으로 미리 봅니다.',
    points: ['항목별 AI 초안', '관련 법령 정리', '공문 서식 미리보기'],
    intro: {
      problem: '불승인공문은 관련 법령 · 판단 자료 · 결정 사유를 정해진 공문 형식에 맞춰 빠짐없이 적어야 합니다.',
      solution: '접수번호로 공문 생성을 요청하면 AI가 항목마다 초안과 가이드를 만들고, 담당자는 항목 단위로 고쳐 공문 서식으로 확인합니다.'
    },
    features: [
      { title: '항목별 AI 초안', desc: '신청 내용부터 결정 사유까지 공문 항목마다 초안을 따로 만들어 필요한 항목만 고칩니다.' },
      { title: 'AI 가이드', desc: '항목마다 설명과 참조를 붙여 어떤 근거로 쓴 문장인지 보고 고칩니다.' },
      { title: '공문 서식 미리보기', desc: '고친 내용이 들어간 불승인공문을 실제 서식으로 미리 보고 인쇄합니다.' }
    ],
    chapters: [
      { title: '공문 생성', caption: '담당자가 접수번호를 넣고 [불승인공문 생성]을 누릅니다.' },
      { title: '항목별 초안', caption: 'AI가 신청 내용 · 관련 법령 · 판단 자료 · 결정 내용 · 결정 사유를 씁니다.' },
      { title: '근거 보며 수정', caption: '결정 사유 옆 가이드를 보고, 담당자가 심의 결과를 반영한 문장을 덧붙입니다.' },
      { title: '항목 복사', caption: '관련 법령 항목만 복사해 다른 문서에 붙여 넣습니다.' },
      { title: '미리보기', caption: '고친 내용이 들어간 불승인공문을 공문 서식으로 미리 봅니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 접수번호 · 문장은 모두 시험용 더미 데이터입니다.',
    hold: 4500,
    app: {
      windowTitle: 'AI 재해조사 어시스턴트 — 불승인공문',
      product: 'AI 재해조사 어시스턴트',
      menus: ['AI어시스턴스', 'AI업무가이드', '재해조사보고서', '불승인공문', '심사의견서'],
      activeMenu: 3,
      pageTitle: '불승인공문',
      receiptNo: RECEIPT_REJECT,
      runLabel: '불승인공문 생성',
      sectionTitle: 'AI 불승인공문',
      items: [
        {
          title: '신청 내용',
          previewLabel: '1) 신청 내용',
          text: '신청인은 업무상 질병으로 요양을 신청하였으나, 조사 결과 업무관련성이 인정되지 않습니다.',
          guide: { desc: '접수 데이터의 신청 구분과 조사 결과를 바탕으로 신청 내용을 정리했습니다.', ref: '접수 데이터 — 신청 구분(업무상 질병)' }
        },
        {
          title: '관련 법령',
          previewLabel: '2) 관련 법령',
          text: '산업재해보상보험법 제37조, 같은 법 시행령 제34조',
          guide: { desc: '업무상 재해의 인정기준과 업무관련성 판단기준 조항을 골랐습니다.', ref: '산업재해보상보험법 제37조 · 같은 법 시행령 제34조' }
        },
        {
          title: '판단 자료',
          previewLabel: '3) 판단 자료',
          text: '진료기록, 사업장 조사서, 신청인 진술서',
          guide: { desc: '결정에 사용한 조사 자료를 나열했습니다.', ref: '재해조사 자료 — 진료기록 · 사업장 조사서 · 신청인 진술서' }
        },
        {
          title: '결정 내용',
          previewLabel: '4) 결정 내용',
          text: '주문: 신청인의 요양급여 신청을 불승인한다.',
          guide: { desc: '공문의 주문 형식에 맞춰 결정 내용을 적었습니다.', ref: '불승인공문 서식 — 주문' }
        },
        {
          title: '결정 사유',
          previewLabel: '5) 결정 사유',
          text: '업무와 상병 사이의 상당인과관계를 인정하기 어렵습니다.',
          guide: { desc: '판단의 근거가 된 심의 절차를 함께 적으면 결정 사유가 분명해집니다.', ref: 'AI업무가이드 — 추천 업무처리절차(업무상 질병판정위원회 심의)' }
        }
      ],
      preview: {
        title: '불승인공문 미리보기',
        docTitle: '불승인공문',
        meta: ['접수번호', RECEIPT_REJECT],
        heading: 'AI 불승인공문 본문'
      }
    },
    script: [
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1100 },
      { do: 'cursor', to: 'receipt', click: true },
      { do: 'type', text: RECEIPT_REJECT, every: 60 },
      { do: 'wait', ms: 350 },
      { do: 'cursor', to: 'run', click: true },
      { do: 'chapter', n: 1 },
      { do: 'generate', every: 40, gap: 300 },
      { do: 'wait', ms: 1300 },
      { do: 'chapter', n: 2 },
      { do: 'cursor', to: 'guide:' + REJ_EDIT },
      { do: 'guide', index: REJ_EDIT },
      { do: 'wait', ms: 1600 },
      { do: 'cursor', to: 'edit:' + REJ_EDIT, click: true },
      { do: 'edit', index: REJ_EDIT, append: REJ_APPEND, every: 45 },
      { do: 'wait', ms: 500 },
      { do: 'cursor', to: 'save:' + REJ_EDIT, click: true },
      { do: 'save', index: REJ_EDIT },
      { do: 'wait', ms: 1500 },
      { do: 'chapter', n: 3 },
      { do: 'cursor', to: 'copy:1', click: true },
      { do: 'copy', index: 1 },
      { do: 'wait', ms: 1900 },
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'preview', click: true },
      { do: 'preview' },
      { do: 'wait', ms: 1300 },
      { do: 'scrollPreview', index: REJ_EDIT },
      { do: 'wait', ms: 2400 }
    ]
  });
})(window);
