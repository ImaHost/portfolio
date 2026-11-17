/*
 * 포트폴리오 프로젝트 등록 — 회사 홈페이지 시연(assets/js/projects.js)에 없는 프로젝트만 여기서 더한다.
 * 한국산업단지공단 규정 자료 관리는 기존 프로젝트(genai-work-platform)의 서비스로 붙으므로 여기 없다.
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  window.AgentDemo.registerProject({
    id: 'kcomwel-ai-assistant',
    order: 30,
    client: '근로복지공단',
    name: 'AI 재해조사 어시스턴트',
    summary:
      '산재 요양 신청 건의 조사 · 심사 업무를 돕는 AI 어시스턴트입니다. 접수번호 하나로 접수 데이터를 불러오고, AI가 보고서 · 공문 · 의견서 초안을 만들면 담당자는 항목별 근거를 보며 고친 뒤 미리보기 · 인쇄합니다.',
    badges: ['항목별 AI 초안', 'AI 가이드(근거 · 참조)', '미리보기 · 인쇄']
  });

  window.AgentDemo.registerProject({
    id: 'txhub-portal',
    order: 40,
    client: 'TxHub',
    name: '클라우드 테스트 자동화 포털',
    summary:
      '성능 테스트 · 기능 테스트 · Lighthouse · Mock API를 한 포털에서 쓰는 SaaS형 테스트 플랫폼입니다. 시나리오 → 플랜 → 스케줄 → 결과 네 단계로 테스트를 쌓고, 계약 크레딧 안에서 실행합니다.',
    badges: ['시나리오 · 플랜 · 스케줄', '실행 결과 리포트', '크레딧 대비 수행 현황']
  });
})(window);
