/*
 * 구축 사례 프로젝트 목록 (설계 0002 §3-5)
 * 1단 프로젝트 탭이 된다. 프로젝트를 추가하면 여기에 한 줄 넣고, 사례 파일에는 project: '<id>'로 소속을 적는다.
 * 고객사명은 이 목록에만 쓴다.
 * (포트폴리오 사본: 본인 작업 사례만 남겼다)
 */
(function (window) {
  'use strict';
  if (!window.AgentDemo) return;

  window.AgentDemo.registerProject({
    id: 'genai-work-platform',
    order: 10,
    client: '한국산업단지공단',
    name: '생성형 AI 업무 플랫폼',
    // 방문자 설명(설계 0002 §3-6) — 사실만 쓴다(효과 수치 · 지어낸 실적 금지)
    summary:
      '공단 업무에 맞춘 생성형 AI 서비스를 하나의 플랫폼으로 구축했습니다. 국회 대응 · 규정 검색 · 공시 작성처럼 근거가 중요한 업무에서 AI가 자료를 찾아 답과 초안을 만들고, 담당자는 확인과 결정에 집중합니다.',
    badges: ['업무별 맞춤 AI 서비스', '근거 · 출처 제시', '담당자 확인 후 확정']
  });
})(window);
