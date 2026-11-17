/*
 * 시나리오 'kcomwel-guide' — 근로복지공단 AI 재해조사 어시스턴트 · AI업무가이드(포트폴리오 설계 0003 §3-1)
 * 화면 유형: kcomwel-guide. 화면 문구 · 구조 · 값은 시험 환경 캡처(work-guide)의 더미 데이터(MOCK-UI-0001)를 따른다.
 * 다른 점: 근무기간은 같은 건의 재해조사보고서(근무경력 5년 3개월)에 맞췄고, 과거 유사사례 3~5행과 결과 비율은
 * 캡처 밖이라 시연용 예시다(비율은 표에 보이는 행에서 센다).
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click) · chapter(n)
 *   kcomwel-guide: type(text, every) · lookup(ms, every) · select(index, value) · fill(field, text) ·
 *                  generate(ms, every, gap) · section(name, every) · law(index) · ratio
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  var RECEIPT = 'MOCK-UI-0001';

  window.AgentDemo.registerScenario({
    id: 'kcomwel-guide',
    order: 5,
    renderer: 'kcomwel-guide',
    project: 'kcomwel-ai-assistant',
    tab: { title: 'AI업무가이드' },
    summary:
      '접수번호로 재해자 · 사업장 정보를 불러오고 직종과 근무기간을 넣으면, AI가 추천 업무처리절차와 ' +
      '상병코드 · 관련 법령 · 과거 유사사례를 한 화면에 정리합니다.',
    points: ['추천 업무처리절차', '상병코드 · 관련 법령', '유사사례 처리 결과'],
    intro: {
      problem: '조사를 시작하기 전에 담당자가 상병의 성격 · 적용 법령 · 비슷한 건의 처리 결과를 따로 찾아 보고 절차를 정해야 합니다.',
      solution: '접수 데이터와 직종 · 근무기간을 바탕으로 AI가 업무처리절차를 추천하고, 판단에 쓸 상병코드 · 법령 조항 · 유사사례를 옆에 붙입니다.'
    },
    features: [
      { title: '추천 업무처리절차', desc: '신청상병이 추정적용 상병인지 보고 자체조사 · 위원회 심의 같은 진행 순서를 제시합니다.' },
      { title: '근거를 한 화면에', desc: '상병코드 정보와 관련 법령 · 조항을 표로 붙여 추천의 근거를 바로 확인합니다.' },
      { title: '과거 유사사례', desc: '같은 상병의 과거 처리 절차와 결과, 승인 · 불승인 비율을 함께 봅니다.' }
    ],
    chapters: [
      { title: '접수 조회', caption: '접수번호를 넣고 [정보 조회]를 누르면 재해자 · 사업장 정보를 불러옵니다.' },
      { title: '직종 · 근무기간', caption: '직종과 근무기간 · 유효기간을 넣고 [AI업무가이드 생성]을 누릅니다.' },
      { title: '추천 절차', caption: 'AI가 신청상병을 보고 추천 업무처리절차를 순서대로 제시합니다.' },
      { title: '상병 · 법령', caption: '상병코드 정보와 관련 법령 · 조항을 함께 보여 줘 근거를 바로 확인합니다.' },
      { title: '유사 사례', caption: '과거 유사사례의 처리 결과와 승인 · 불승인 비율을 함께 봅니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 재해자 · 사업장 · 유사사례는 모두 시험용 더미 데이터입니다.',
    hold: 4500,
    app: {
      windowTitle: 'AI 재해조사 어시스턴트 — AI업무가이드',
      product: 'AI 재해조사 어시스턴트',
      menus: ['AI어시스턴스', 'AI업무가이드', '재해조사보고서', '불승인공문', '심사의견서'],
      activeMenu: 1,
      pageTitle: 'AI업무가이드',
      receiptNo: RECEIPT,
      // [라벨, 값, 라벨, 값] 또는 한 줄 전체 [라벨, 값] — 캡처의 더미 값
      victim: {
        title: '재해자 정보',
        rows: [
          ['접수번호', RECEIPT, '접수일자', '2025-09-01'],
          ['재해자 성명', '홍길동', '재해일자', '2025-08-15 09:30'],
          ['재해발생 형태', '업무상 질병 (02)'],
          ['상병명 (상병코드)', '회전근개파열 (M75.1)'],
          ['재해발생 경위', '작업 중 어깨에 무리한 힘이 가해져 통증 발생']
        ]
      },
      workplace: {
        title: '사업장 정보',
        rows: [
          ['사업장 정보', '목업건설(주)', '관리번호', '1234567890'],
          ['업종', '건설업 (40001)'],
          ['종업원 수', '42', '폐업 여부', 'N']
        ]
      },
      procedureTitle: '추천 업무처리절차',
      // ** 사이는 굵게 — 캡처 문장 그대로
      procedure: [
        '신청인의 신청상병은 **"회전근개파열(M75.1)"**이고 이는 추정적용 상병에 해당합니다.',
        '위와 같은 사유로 **"자체조사"** 진행하는 것을 추천합니다.',
        '**[자체조사]** 신체부담업무조사 후 업무상 질병판정위원회 심의 의뢰'
      ],
      codes: {
        title: '상병코드 정보',
        cols: ['주/부/파생', '상병코드', '세부상병명'],
        widths: '76px 72px minmax(0, 1fr)',
        widthsSm: '64px 60px minmax(0, 1fr)',
        rows: [
          ['주상병', 'M75.1', '회전근개파열'],
          ['부상병', 'M2321', '우측 슬관절 내측 반월상 연골판 파열']
        ]
      },
      laws: {
        title: '관련 법령 및 규정',
        cols: ['구분', '법령/규정명', '조항', '적용내용'],
        widths: '46px minmax(0, 1.15fr) 78px minmax(0, 1fr)',
        widthsSm: '40px minmax(0, 1fr) 66px minmax(0, 1fr)',
        links: [2],
        rows: [
          ['법률', '산업재해보상보험법', '제37조', '업무상 재해의 인정기준'],
          ['시행령', '산업재해보상보험법 시행령', '제34조\n제4조제11항', '업무관련성 판단기준\n질병별 자료수집 목록']
        ]
      },
      cases: {
        title: '과거 유사사례 업무처리 절차',
        cols: ['순위', '접수번호', '상병코드', '세부상해부위명', '업무처리', '업무처리결과'],
        widths: '34px 72px 56px minmax(0, 1fr) 56px 64px',
        widthsSm: '28px 74px minmax(0, 1fr) 70px',
        hideSm: [2, 4], // 좁은 창 — 상병코드 · 업무처리 열은 모든 행이 같아 숨긴다
        links: [1],
        resultCol: 5,
        // 1 · 2행은 캡처, 3~5행은 시연용 예시
        rows: [
          ['1', '1234-0001', 'M75.1', '어깨 회전근개 파열', '자체처리', '승인'],
          ['2', '1234-0002', 'M75.1', '어깨 회전근개 파열', '자체처리', '불승인'],
          ['3', '1234-0003', 'M75.1', '어깨 회전근개 파열', '자체처리', '승인'],
          ['4', '1234-0004', 'M75.1', '어깨 회전근개 부분 파열', '자체처리', '승인'],
          ['5', '1234-0005', 'M75.1', '어깨 회전근개 파열', '자체처리', '불승인']
        ]
      }
    },
    script: [
      // 1. 접수 조회
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1100 },
      { do: 'cursor', to: 'receipt', click: true },
      { do: 'type', text: RECEIPT, every: 60 },
      { do: 'wait', ms: 300 },
      { do: 'cursor', to: 'lookup', click: true },
      { do: 'lookup', ms: 700, every: 75 },
      { do: 'wait', ms: 1300 },
      // 2. 직종 · 근무기간 · 유효기간
      { do: 'chapter', n: 1 },
      { do: 'cursor', to: 'job:0', click: true },
      { do: 'select', index: 0, value: '건설업' },
      { do: 'cursor', to: 'job:1', click: true },
      { do: 'select', index: 1, value: '내장인테리어목공' },
      { do: 'cursor', to: 'years', click: true },
      { do: 'fill', field: 'years', text: '5' },
      { do: 'cursor', to: 'months', click: true },
      { do: 'fill', field: 'months', text: '3' },
      { do: 'cursor', to: 'valid', click: true },
      { do: 'fill', field: 'valid', text: '3' },
      { do: 'wait', ms: 350 },
      { do: 'cursor', to: 'run', click: true },
      // 3. 추천 업무처리절차
      { do: 'chapter', n: 2 },
      { do: 'generate', ms: 600, every: 32, gap: 300 },
      { do: 'wait', ms: 1500 },
      // 4. 상병코드 · 관련 법령
      { do: 'chapter', n: 3 },
      { do: 'section', name: 'codes', every: 180 },
      { do: 'wait', ms: 700 },
      { do: 'section', name: 'laws', every: 180 },
      { do: 'wait', ms: 500 },
      { do: 'cursor', to: 'law:0' },
      { do: 'law', index: 0 },
      { do: 'wait', ms: 1700 },
      // 5. 과거 유사사례 · 결과 비율
      { do: 'chapter', n: 4 },
      { do: 'section', name: 'cases', every: 170 },
      { do: 'wait', ms: 700 },
      { do: 'cursor', to: 'ratio', click: true },
      { do: 'ratio' },
      { do: 'wait', ms: 2600 }
    ]
  });
})(window);
