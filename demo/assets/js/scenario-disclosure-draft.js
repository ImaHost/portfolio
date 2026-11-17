/*
 * 사례 '공시 작성 AI' (설계 0002 §3-3)
 * 화면 유형: form-draft. 화면 문구는 원본 화면을 따르고, 자료 · 수치 · 파일 이름은 모두 시연용 예시다.
 *
 * 각본 줄 { do: '<동작>', ... }
 *   엔진 공통: wait(ms) · cursor(to, click)
 *   form-draft: upload · generate · stage(key, ms) · reveal(ms) · select(cell, ms) · detail(ms) · goFlag(id, ms) · alt(flag, ms)
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  window.AgentDemo.registerScenario({
    id: 'disclosure-draft',
    order: 30,
    renderer: 'form-draft',
    project: 'genai-work-platform',
    tab: { title: '공시 작성 AI' },
    summary: '자료를 올리면 AI가 공시 양식을 채우고, 칸마다 계산 내역 · 매뉴얼 근거와 확인할 점을 함께 보여 줍니다.',
    points: ['양식 자동 채움', '칸별 근거 · 계산 내역', '매뉴얼 기준 확인'],
    // 방문자 설명(설계 0002 §3-6) — 업무 과제 · AI 에이전트의 해결 · 핵심 기능 · 시연 순서(각본의 chapter와 짝)
    intro: {
      problem: '공시 양식의 칸마다 인사 · 재무 자료에서 값을 찾아 매뉴얼 기준대로 계산하고, 표 사이 합계까지 맞춰야 합니다.',
      solution: '자료를 올리면 AI가 양식을 한 번에 채우고 칸마다 계산 내역과 매뉴얼 근거를 붙입니다. 매뉴얼과 다르게 볼 수 있는 값은 \'확인 필요\'로 알려 줍니다.'
    },
    features: [
      { title: '양식 자동 채움', desc: '올린 자료를 읽어 공시 양식의 값을 한꺼번에 채우고, 합계 칸은 자동으로 계산합니다.' },
      { title: '칸별 근거 · 계산 내역', desc: '칸을 누르면 어떤 자료에서 어떻게 계산했는지 매뉴얼 원문과 함께 보여 줍니다.' },
      { title: '매뉴얼 기준 확인', desc: '매뉴얼 기준과 다를 수 있는 값을 찾아 대안 값과 함께 제시하고, 한 번에 바꿀 수 있습니다.' }
    ],
    chapters: [
      { title: '자료 올리기', caption: '담당자가 인사 현황 엑셀과 지난 공시 자료를 올립니다.' },
      { title: '초안 생성', caption: 'AI가 자료 읽기 → 값 채우기 → 빈 칸 분석 → 양식 검사 → 초안 저장 순서로 처리합니다.' },
      { title: '값과 표시', caption: '양식이 한꺼번에 채워지고, 확인이 필요한 칸은 주황색으로 표시됩니다.' },
      { title: '근거 보기', caption: '칸을 누르면 계산 내역(297 − 12 − 12 = 273)과 매뉴얼 원문이 나옵니다.' },
      { title: '기준 맞추기', caption: '\'매뉴얼 기준 값 쓰기\'를 누르면 관련 칸과 합계가 함께 바뀝니다.' }
    ],
    caption: '※ 실제 구축 화면을 재구성한 시연입니다. 화면 속 자료 · 수치는 예시입니다.',
    hold: 4000,
    app: {
      windowTitle: 'AI 업무지원 포털 — 공시초안작성',
      brand: 'AI 업무지원',
      menus: [
        { label: '국회대응', icon: 'file' },
        { label: '규정검색', icon: 'book' },
        { label: '공시작성', icon: 'chart', active: true },
        { label: 'AI대화', icon: 'chat' }
      ],
      screenTitle: '공시초안작성',
      screenDesc: '자료를 올리면 AI가 공시 양식을 채웁니다. 값과 근거를 확인해 고친 뒤 내려받아 알리오 편집기에서 마무리합니다.',
      disclosure: { name: '3. 임직원 수', period: '2/4분기', periodOption: '2/4분기 (7월 제출)', version: '14.1' },
      toc: ['1. 임직원수', '2. 직급별 인원수', '3. 비정규직 현황', '기관 공시 담당자'],
      needs: [
        {
          name: '분기 공시 data 자료',
          note: '총괄 · 휴직자 · 단시간 · 비정규직 현황으로 이번 분기 현원을 계산합니다.',
          required: true
        },
        {
          name: '지난 공시 화면 PDF 또는 .asd',
          note: '지난 5개년 값과 정원 · 소속외 · 직급 이름 · 작성기준을 가장 최근 공시에서 가져옵니다.',
          required: false
        }
      ],
      files: [
        { name: '2026년 2분기 인사 현황.xlsx', size: '1.6 MB', type: 'XLSX' },
        { name: '지난 공시_임직원 수_2026년 1분기.pdf', size: '380 KB', type: 'PDF' }
      ],
      // 양식 표 — prev = 2025년(지난 공시 값) · value = 2026년 2/4분기(AI 초안) · sum = 자동 합계(재료 칸의 합)
      form: {
        section: '1. 임직원수',
        unit: '(단위: 명)',
        head: { label: '구분', prev: '2025년', cur: '2026년 2/4분기' },
        rows: [
          { key: 'EX', group: '임원', span: 1, label: '상임 현원', prev: '3', value: '3' },
          { key: 'QT', group: '일반정규직', span: 4, label: '정원', prev: '284', value: '290' },
          { key: 'FT', label: '현원 전일제', prev: '268', value: '273' },
          { key: 'PT', label: '현원 단시간', prev: '6.75', value: '9.00' },
          { key: 'SUM', label: '현원 계', sum: ['FT', 'PT'] },
          { key: 'IC', group: '무기계약직', span: 1, label: '현원', prev: '21', value: '23' },
          { key: 'OS', group: '소속외 인력', span: 1, label: '용역(민간)', prev: '14', value: '9' }
        ]
      },
      // 칸 근거(2026년 2/4분기 열)
      evidence: {
        FT: {
          confidence: 'computed',
          file: '2026년 2분기 인사 현황.xlsx',
          where: '「총괄」 시트',
          unit: '명',
          how: '매뉴얼 계산: 명부 인원 − 현원 제외 휴직 − 단시간',
          manual: '통합공시 매뉴얼 56쪽',
          steps: [
            { op: '', label: '「총괄」 시트 일반 정규직 명부 인원', note: '명부에 오른 일반 정규직 전체', value: '297명' },
            {
              op: '−',
              label: '현원에서 빼는 휴직자',
              note: '6월 30일 기준 군입대 · 3개월 이상 육아휴직 · 6개월 이상 창업휴직',
              value: '12명'
            },
            { op: '−', label: '단시간 근로자', note: '명부에 단시간으로 표시된 사람', value: '12명' },
            { op: '=', label: '전일제 현원', value: '273명' }
          ],
          quote: {
            doc: '통합공시 매뉴얼',
            page: '56쪽',
            text: '현원(전일제)은 전체 현원에서 단시간 근로자 현원을 뺀 인원으로 적습니다.',
            highlight: '단시간 근로자 현원을 뺀 인원'
          },
          interp: '단시간은 명부의 단시간 표시를 그대로 셌습니다.',
          notice: '매뉴얼의 공시시점(6월 30일) 기준으로 판정하면 단시간은 10명이고, 그 기준이면 전일제는 275명입니다.',
          flag: 'short'
        },
        PT: {
          confidence: 'computed',
          file: '2026년 2분기 인사 현황.xlsx',
          where: '「총괄」 시트',
          unit: '명',
          how: '단시간 근로자 12명 × 0.75(8시간/일 기준 환산)',
          manual: '통합공시 매뉴얼 57쪽'
        },
        OS: {
          confidence: 'exact',
          file: '2026년 2분기 인사 현황.xlsx',
          where: '「소속외 인력」 시트',
          unit: '명'
        }
      },
      flags: [
        {
          id: 'short',
          severity: 'warn',
          title: '단시간 근로자 판정 기준',
          body: '명부의 단시간 표시로 채웠습니다. 매뉴얼의 공시시점(6월 30일) 기준으로 판정하면 인원이 달라집니다.',
          table: [
            ['구분', '현재 값', '매뉴얼 기준'],
            ['단시간', '12명 → 9.00', '10명 → 7.50'],
            ['전일제', '273', '275']
          ],
          ref: '통합공시 매뉴얼 57쪽 · 「총괄」 시트 단시간 표시',
          cells: ['PT'],
          altLabel: '매뉴얼 기준 값 쓰기',
          alt: { PT: '7.50', FT: '275' }
        },
        {
          id: 'outs',
          severity: 'info',
          title: '용역(민간) 인원 큰 폭 감소',
          body: '2025년 말 14명에서 이번 분기 9명으로 줄었습니다(−5명). 변동 사유를 확인해 주세요.',
          ref: '2026년 2분기 인사 현황.xlsx 「소속외 인력」 시트',
          cells: ['OS']
        }
      ],
      checks: { ok: 3, all: 3 }
    },
    script: [
      // 1. 공시 선택이 끝난 빈 양식 — 자료 없음
      { do: 'chapter', n: 0 },
      { do: 'wait', ms: 1800 },
      // 2. 자료 올리기 — 파일 2건 업로드 중 → 올림 완료
      { do: 'cursor', to: 'pick-file', click: true },
      { do: 'upload', stagger: 350, settle: 500 },
      { do: 'wait', ms: 700 },
      // 3. 초안 생성 — 5단계 진행(라벨만)
      { do: 'chapter', n: 1 },
      { do: 'cursor', to: 'generate', click: true },
      { do: 'generate', ms: 600 },
      { do: 'stage', key: 'READ', ms: 700 },
      { do: 'stage', key: 'FILL', ms: 1300 },
      { do: 'stage', key: 'ANALYZE', ms: 700 },
      { do: 'stage', key: 'CHECK', ms: 700 },
      { do: 'stage', key: 'SAVE', ms: 500 },
      // 4. 완료 — 자료 칸 접힘 · 값 한꺼번에 · 칸 표시 · 확인 필요 카드 · 토스트
      { do: 'chapter', n: 2 },
      { do: 'reveal', ms: 3000 },
      // 5. 전일제 칸 → 값 근거
      { do: 'chapter', n: 3 },
      { do: 'cursor', to: 'cell:FT', click: true },
      { do: 'select', cell: 'FT', ms: 1700 },
      // 6. 근거 자세히 — 계산 내역 · 매뉴얼 원문 · 적용한 해석
      { do: 'cursor', to: 'detail', click: true },
      { do: 'detail', ms: 3500 },
      // 7. 확인 필요 카드로
      { do: 'chapter', n: 4 },
      { do: 'cursor', to: 'go-flag', click: true },
      { do: 'goFlag', id: 'short', ms: 1200 },
      // 8. 매뉴얼 기준 값 쓰기 → 값 바뀜 · 모두 처리
      { do: 'cursor', to: 'flag:short:alt', click: true },
      { do: 'alt', flag: 'short', ms: 3400 },
      // 마무리 — 이제 할 일(내려받기)을 가리킨다
      { do: 'cursor', to: 'download' }
    ]
  });
})(window);
