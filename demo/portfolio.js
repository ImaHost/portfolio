/*
 * 주소 #<프로젝트 id> 또는 #<사례 id>로 들어오면 그 탭을 연다(각 프로젝트 README에서 바로 그 시연으로).
 * 엔진 내부를 건드리지 않고 탭 버튼(data-pid · data-id)을 누른다. 서비스 탭은 고른 프로젝트 것만 그려지므로
 * 사례 → 프로젝트 짝을 여기 적어 둔다(사례를 더하면 한 줄 추가). 모르는 id면 아무것도 하지 않는다.
 */
(function (window, document) {
  'use strict';

  var PROJECT_OF = {
    'regulation-search': 'genai-work-platform',
    'regulation-admin': 'genai-work-platform',
    'assembly-answer': 'genai-work-platform',
    'disclosure-draft': 'genai-work-platform',
    'kcomwel-guide': 'kcomwel-ai-assistant',
    'kcomwel-report': 'kcomwel-ai-assistant',
    'kcomwel-opinion': 'kcomwel-ai-assistant',
    'kcomwel-rejection': 'kcomwel-ai-assistant',
    'txhub-perf': 'txhub-portal'
  };

  function find(root, selector, attr, value) {
    var list = root.querySelectorAll(selector);
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute(attr) === value) return list[i];
    }
    return null;
  }

  function open() {
    var id = decodeURIComponent((window.location.hash || '').slice(1));
    var root = document.querySelector('[data-agent-demo]');
    if (!id || !root) return;
    var project = find(root, '.agd-ptab', 'data-pid', id);
    if (project) {
      project.click();
      return;
    }
    if (!PROJECT_OF[id]) return;
    project = find(root, '.agd-ptab', 'data-pid', PROJECT_OF[id]);
    if (!project) return;
    project.click();
    var tab = find(root, '.agd-tab', 'data-id', id);
    if (tab) tab.click();
  }

  window.addEventListener('load', open);
  window.addEventListener('hashchange', open);
})(window, document);
