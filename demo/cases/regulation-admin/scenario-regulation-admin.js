/*
 * 시나리오 'regulation-admin' — 규정 자료 관리(관리자) · 포트폴리오 설계 0002 §3-1
 * 화면 유형: regulation-admin. 화면 문구 · 규정명 · 쪽수 · 일치율 · 도구 정의는 포트폴리오 캡처
 * (kicox-regulation-rag/images: documents-list · document-overview · document-page-compare · document-tools · tool-detail)와
 * README 3 · 5절을 따른다. 캡처에 없는 화면(규정 올리기 창 · 처리 과정 목록 · 처리 중/검토 대기 상태 · 시험 실행 결과 줄)은 재구성이다.
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click)
 *   regulation-admin: openUpload · pickFile · submitUpload · openDoc · process(every) · tab(id) · page(n) ·
 *                     verify(every) · type(field, text) · calc · publish
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  var FILE = '전보배치 및 직무전문가 제도 운영지침(2025년도 12월 23일 개정).pdf';

  // 별표3(10쪽) — 쪽 대조 캡처의 원문 · 옮겨 적은 내용
  var ITEMS = [
    '4년제 이상의 대학에서 법, 경영, 행정, 사회(복지)학 분야의 조교수 이상으로 5년 이상 재직 중이거나 재직경력이 있는 사람',
    '변호사, 회계사, 공인노무사 등의 자격이 있고 해당 분야에서 5년 이상의 실무 경력이 있는 사람',
    '「공공기관의 운영에 관한 법률」제5조제3항에 해당하는 공기업 또는 준정부기관에서 1급 이상의 임직원으로 재직하고 청렴성이 높은 사람',
    '국가 및 지방자치단체에서 3급 이상 공무원으로 재직하고 청렴성이 높은 사람',
    '의사 또는 한의사로써 5년 이상 경력이 있는 사람',
    '그 밖에 법률 또는 노동관계업무에 10년 이상 종사하여 전문적인 지식과 경험을 갖춘 자로서 외부위원으로 적합하다고 인정되는 사람'
  ];
  var PAGE_TITLE = '인사고충심사위원회 외부위원 위촉자격(제15조 제2항 관련)';
  var TRANSCRIPT = ['[별표3]', '', '# ' + PAGE_TITLE, '']
    .concat(ITEMS.map(function (t, i) { return (i + 1) + '. ' + t; }))
    .join('\n');

  var SOURCE = "[별표2] <개정 '22.06.01, '23.01.16, '23.10.25, '24.05.22, '24.11.01, '25.12.23.> 전보점수 적립 및 운영 기준(제10조 관련) · p.8-9";

  window.AgentDemo.registerScenario({
    id: 'regulation-admin',
    order: 15,
    renderer: 'regulation-admin',
    project: 'genai-work-platform',
    tab: { title: '규정 자료 관리' },
    summary:
      '규정 파일을 올리면 쪽을 옮겨 적고 청크 · 요약 · 계산 도구를 만듭니다. ' +
      '담당자가 쪽 대조와 계산 도구를 검토한 뒤 게시하면 규정질의응답에서 검색됩니다.',
    points: ['전처리 8단계', '쪽 대조', '계산 도구 자동 점검'],
    intro: {
      problem:
        '규정은 HWP · PDF로 되어 있고 표 · 별표 · 계산식이 많아, 글자만 뽑아 넣으면 검색과 계산이 틀리기 쉽습니다. 규정 138건을 사람이 하나하나 옮겨 적고 확인할 수도 없습니다.',
      solution:
        '쪽 이미지를 비전 LLM이 옮겨 적고 PDF 텍스트와 대조해, 일치율이 낮은 쪽만 사람이 확인합니다. 규정의 식은 계산 도구로 뽑아 테스트와 근거 숫자를 자동으로 점검합니다.'
    },
    features: [
      { title: '전처리 8단계', desc: '변환부터 계산 도구 점검까지 쪽마다 따로 처리해, 실패한 쪽만 다시 돌립니다.' },
      { title: '쪽 대조', desc: '원문 쪽과 옮겨 적은 글을 나란히 보여 주고, 일치율 0.97 미만인 쪽을 검증대상으로 표시합니다.' },
      { title: '계산 도구 자동 점검', desc: '형식 · 중복 · 테스트 · 근거 숫자를 기계가 먼저 점검하고, 근거 없는 숫자가 있는 도구는 질의응답에 쓰지 않습니다.' }
    ],
    chapters: [
      { title: '규정 올리기', caption: '관리자가 [규정 올리기]로 규정 파일을 올리면 목록에 처리 중으로 들어옵니다.' },
      { title: '전처리 8단계', caption: '변환부터 옮겨 적기 · 대조 · 구조화 · 요약 · 도구 추출 · 점검까지 차례로 돕니다.' },
      { title: '쪽 대조', caption: '일치율 0.97 미만인 쪽은 검증대상이 되고, 담당자가 원문과 나란히 확인합니다.' },
      { title: '계산 도구', caption: '규정의 식을 도구로 뽑아 테스트하고, 식의 숫자(24 · 48)를 원문과 대조합니다.' },
      { title: '시험 실행 · 게시', caption: '값을 넣어 시험 실행해 보고, 검토가 끝나면 게시해 규정질의응답에서 검색되게 합니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 규정 · 수치는 시험 환경의 예시입니다.',
    hold: 4500,
    app: {
      windowTitle: 'AI 업무지원 포털 — 관리 · 규정자료관리',
      brand: 'AI 업무지원',
      menus: [
        { label: '국회대응', icon: 'file' },
        { label: '규정검색', icon: 'book' },
        { label: '공시작성', icon: 'chart' },
        { label: '관리', icon: 'shield', open: true, sub: ['전체 질의서', '처리 추적', '사용자 권한', '규정자료관리'], subActive: 3 }
      ],
      page: {
        title: '규정자료관리',
        desc: '규정 파일을 올리면 쪽을 옮겨 적고 청크 · 요약 · 계산 도구를 만듭니다. 검토한 뒤 게시하면 규정질의응답에서 검색됩니다.'
      },
      // 시작 수 — 캡처의 최종 수(전체 138 · 게시됨 137 · 게시중지 1)에서 이번에 올리는 1건을 뺀 값
      counts: { all: 137, published: 136, paused: 1 },
      rows: [
        { name: '부정청탁 및 금품 등 수수의 신고사무 처리지침', meta: '기타 · alio:32830', revised: '2020-12-28', pages: '24쪽', chunks: '41', tools: '—' },
        { name: '감사규정 시행세칙', meta: '인사·복무·징계 · alio:21743', revised: '2026-03-04', pages: '42쪽', chunks: '80', tools: '—' },
        { name: '교육훈련규정', meta: '기타 · alio:20472', revised: '2025-12-18', pages: '13쪽', chunks: '47', tools: '2 / 3' },
        { name: '적극행정심의위원회 운영지침', meta: '기타 · alio:42549', revised: '2020-09-02', pages: '3쪽', chunks: '9', tools: '—' },
        { name: '보안규정', meta: '기타 · alio:19660', revised: '2025-12-30', pages: '54쪽', chunks: '104', tools: '—' },
        { name: '임원 복무규정', meta: '인사·복무·징계 · alio:44097', revised: '2024-04-29', pages: '3쪽', chunks: '15', tools: '—' }
      ],
      upload: { file: FILE, category: '인사·복무·징계' },
      doc: {
        name: '전보배치 및 직무전문가 제도 운영지침',
        meta: '인사·복무·징계 · alio:23070',
        revised: '2025-12-23',
        file: FILE,
        row: { pages: '17쪽', chunks: '51', tools: '2 / 2' },
        // 집계(개요 캡처) — 처리 단계가 끝날 때 하나씩 채운다
        stats: [
          { key: 'pages', label: '쪽', value: '17', sub: '검증대상 7' },
          { key: 'chunks', label: '청크', value: '51', sub: '절 17개' },
          { key: 'numeric', label: '수치 청크 검증', value: '0 / 28' },
          { key: 'tools', label: '계산 도구 사용', value: '2 / 2' }
        ],
        // 전처리 8단계(README 3절) — show: 끝나면 채울 집계 칸 · tab: 끝나면 채울 탭 숫자
        steps: [
          { name: '변환 · 렌더링', desc: 'HWP · HWPX · PDF → 쪽 이미지', result: '17쪽', show: ['pages.value'] },
          { name: '쪽 옮겨 적기', desc: '비전 LLM이 쪽 이미지를 마크다운으로', result: '17 / 17쪽' },
          { name: '원문 대조', desc: 'PDF 텍스트 레이어와 한글 일치율 비교', result: '검증대상 7쪽', show: ['pages.sub'], tab: { compare: 17 } },
          { name: '구조화', desc: '장 · 조 · 항 · 별표 · 서식을 절로', result: '절 17개', show: ['chunks.sub'] },
          { name: '청크 분할', desc: '절 안에서 토큰 기준으로 나눔', result: '청크 51개', show: ['chunks.value', 'numeric.value'], tab: { chunks: 51 } },
          { name: '요약', desc: '절 요약 · 문서 요약', result: '절 17 · 문서 1' },
          { name: '계산 도구 추출', desc: '규정의 수식 · 표를 실행할 수 있는 도구로', result: '도구 2개', tab: { tools: 2 } },
          { name: '점검', desc: '형식 · 중복 · 테스트 · 근거 수치 자동 검사', result: '검사 통과 2', show: ['tools.value'] }
        ],
        // 쪽 대조(캡처) — 쪽별 일치율 %, 0.97 미만은 검증대상
        matches: [100, 100, 100, 100, 100, 100, 100, 98.7, 100, 0, 100, 93.7, 31.7, 64.1, 94.7, 86.7, 92.7],
        threshold: 97,
        page: { n: 10, label: '[별표3]', title: PAGE_TITLE, items: ITEMS, transcript: TRANSCRIPT },
        // 계산 도구(캡처)
        toolTags: ['질의응답 사용 2 / 2', '추출한 절 3개 · 계산이 아니라 뺀 정의 0개'],
        toolFilters: [
          { label: '전체', n: 2 },
          { label: '검사 통과', n: 2 },
          { label: '주의 필요', n: 0 },
          { label: '정의 오류', n: 0 }
        ],
        tools: [
          {
            name: 'promotion_transfer_points_regrant',
            source: SOURCE,
            desc: '승진 직전 비생활근무지에서 근무한 승진자에게 다시 부여할 전보점수를 계산한다',
            usage: [
              ['쓰는 때', '승진 직전 비생활근무지에서 근무한 승진자가 비생활근무지 연속근무기간과 승진 전 전보점수로 승진 후 다시 부여받는 전보점수를 알고 싶을 때'],
              ['예시 질문', '“승진 전에 비생활근무지에서 18개월 연속 근무했고 전보점수가 40점이었어요. 승진하면 몇 점을 다시 받나요?”\n“비생활근무지에서 30개월 계속 일하다 승진했는데 승진 전 전보점수가 60점이면 재부여 점수가 얼마예요?”'],
              ['쓰지 않는 경우', '비생활근무지 근무 기간 동안 거리·가산 요건에 따라 매달 새로 쌓이는 전보점수를 묻는 질문에는 쓰지 않으며, 이 경우는 transfer_points_accrual 도구를 쓴다.']
            ],
            input: 'consecutive_months(승진 직전 비생활근무지 연속근무기간 · 월), points_before_promotion(승진 전 전보점수 · 점)',
            code: [
              'capped_months = min(consecutive_months, 24)',
              'regrant_points = capped_months / 48 * points_before_promotion',
              '→ regrant_points (점)'
            ],
            basis: '재부여 점수 = {비생활근무지 연속근무기간(최대 24개월) / 48개월} X 승진 전 전보점수',
            // 근거 대조(README 5절) — 식의 숫자가 원문에 있는지
            basisNums: ['24', '48'],
            tests: [
              '{"consecutive_months":30,"points_before_promotion":40} → 20 통과',
              '{"consecutive_months":12,"points_before_promotion":36} → 9 통과'
            ],
            fields: [
              { label: '승진 직전 비생활근무지 연속근무기간', unit: '월' },
              { label: '승진 전 전보점수', unit: '점' }
            ],
            result: '→ regrant_points 20 (점)'
          },
          {
            name: 'transfer_points_accrual',
            source: SOURCE,
            desc: '비생활근무지 근무 직원의 거리·자녀양육·임신·대상지역 여부와 근무 개월수로 적립되는 전보점수를 계산한다'
          }
        ]
      }
    },
    script: [
      // 1. 규정 목록 → [규정 올리기] → 파일 고르기 → 올리기
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1300 },
      { do: 'cursor', to: 'upload', click: true },
      { do: 'openUpload' },
      { do: 'wait', ms: 400 },
      { do: 'cursor', to: 'drop', click: true },
      { do: 'pickFile' },
      { do: 'wait', ms: 1200 },
      { do: 'cursor', to: 'submit', click: true },
      { do: 'submitUpload' },
      { do: 'wait', ms: 900 },
      // 2. 새 행을 열면 전처리 8단계가 차례로
      { do: 'chapter', n: 1 },
      { do: 'cursor', to: 'row:new', click: true },
      { do: 'openDoc' },
      { do: 'wait', ms: 300 },
      { do: 'process', every: 620 },
      { do: 'wait', ms: 1300 },
      // 3. 쪽 대조 — 검증대상 쪽을 원문과 나란히
      { do: 'chapter', n: 2 },
      { do: 'cursor', to: 'tab:compare', click: true },
      { do: 'tab', id: 'compare' },
      { do: 'wait', ms: 800 },
      { do: 'cursor', to: 'page:10', click: true },
      { do: 'page', n: 10 },
      { do: 'wait', ms: 3000 },
      // 4. 계산 도구 — 테스트 · 근거 숫자 대조
      { do: 'chapter', n: 3 },
      { do: 'cursor', to: 'tab:tools', click: true },
      { do: 'tab', id: 'tools' },
      { do: 'wait', ms: 600 },
      { do: 'verify', every: 550 },
      { do: 'wait', ms: 1400 },
      // 5. 시험 실행 → 게시
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'input:0', click: true },
      { do: 'type', field: 0, text: '30' },
      { do: 'cursor', to: 'input:1', click: true },
      { do: 'type', field: 1, text: '40' },
      { do: 'cursor', to: 'calc', click: true },
      { do: 'calc' },
      { do: 'wait', ms: 1600 },
      { do: 'cursor', to: 'publish', click: true },
      { do: 'publish' },
      { do: 'wait', ms: 2000 }
    ]
  });
})(window);
