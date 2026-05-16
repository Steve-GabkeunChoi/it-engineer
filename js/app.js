const state = {
  chapters: [],
  mockExams: [],
  selectedItem: null,
  selectedAnswers: {},
  lastResult: null
};

const els = {
  chapterList: document.getElementById('chapterList'),
  chapterTitle: document.getElementById('chapterTitle'),
  chapterSummary: document.getElementById('chapterSummary'),
  loadStatus: document.getElementById('loadStatus'),
  lectureContent: document.getElementById('lectureContent'),
  practiceContent: document.getElementById('practiceContent'),
  quizForm: document.getElementById('quizForm'),
  analysisContent: document.getElementById('analysisContent'),
  gradeBtn: document.getElementById('gradeBtn'),
  resetBtn: document.getElementById('resetBtn'),
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.tab-panel'),
  heroLoadStatus: document.getElementById('heroLoadStatus'),
  chapterCountBadge: document.getElementById('chapterCountBadge'),
  sidebarTitle: document.getElementById('sidebarTitle')
};

async function init() {
  bindTabs();
  bindActions();
  await loadModules();
}

async function loadModules() {
  try {
    els.loadStatus.textContent = '로딩 중';

    const indexResponse = await fetch('data/chapters/index.json', { cache: 'no-store' });
    if (!indexResponse.ok) throw new Error('data/chapters/index.json을 읽을 수 없습니다.');

    const indexData = await indexResponse.json();
    if (!indexData || !Array.isArray(indexData.modules)) {
      throw new Error('index.json에는 modules 배열이 필요합니다.');
    }

    const chapters = await Promise.all(indexData.modules.map(async moduleInfo => {
      const response = await fetch(`data/chapters/${moduleInfo.file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${moduleInfo.file} 파일을 읽을 수 없습니다.`);
      const chapter = await response.json();
      validateLearningItem(chapter, moduleInfo.file, 'chapter');
      return chapter;
    }));

    state.chapters = chapters.sort((a, b) => {
      const subjectCompare = Number(a.subjectOrder || 0) - Number(b.subjectOrder || 0);
      if (subjectCompare !== 0) return subjectCompare;
      return Number(a.chapterOrder || a.order || 0) - Number(b.chapterOrder || b.order || 0);
    });

    state.mockExams = await loadMockExamsSequentially();

    renderNavigation();

    const firstChapter = state.chapters[0];
    if (firstChapter) selectItem('chapter', firstChapter.id);

    const statusText = `${state.chapters.length}개 챕터 · ${state.mockExams.length}회 모의고사`;
    els.loadStatus.textContent = statusText;
    if (els.heroLoadStatus) els.heroLoadStatus.textContent = statusText;
    if (els.chapterCountBadge) els.chapterCountBadge.textContent = `${state.chapters.length + state.mockExams.length}`;
  } catch (error) {
    els.loadStatus.textContent = '로드 실패';
    if (els.heroLoadStatus) els.heroLoadStatus.textContent = '로드 실패';
    els.chapterTitle.textContent = 'JSON 모듈 로드 실패';
    els.chapterSummary.textContent = error.message;
    els.lectureContent.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function loadMockExamsSequentially() {
  const exams = [];
  const maxRounds = 30;

  for (let round = 1; round <= maxRounds; round += 1) {
    const fileName = `mock-exam-${round}.json`;
    const response = await fetch(`data/mock-exams/${fileName}`, { cache: 'no-store' });

    if (!response.ok) {
      break;
    }

    const exam = await response.json();
    validateLearningItem(exam, fileName, 'mock');
    exams.push(exam);
  }

  return exams.sort((a, b) => Number(a.round || a.order || 0) - Number(b.round || b.order || 0));
}

function validateLearningItem(item, fileName, expectedType) {
  ['id', 'title', 'summary', 'questions'].forEach(key => {
    if (!(key in item)) throw new Error(`${fileName} 파일에 ${key} 항목이 없습니다.`);
  });

  if (!Array.isArray(item.questions)) {
    throw new Error(`${fileName} 파일의 questions는 배열이어야 합니다.`);
  }

  if (expectedType === 'chapter') {
    ['lecture', 'subjectId', 'subjectTitle', 'chapterTitle'].forEach(key => {
      if (!(key in item)) throw new Error(`${fileName} 파일에 ${key} 항목이 없습니다.`);
    });
  }
}

function renderNavigation() {
  const groupedSubjects = groupBySubject(state.chapters);

  const subjectHtml = groupedSubjects.map(group => {
    const chapterButtons = group.chapters.map(chapter => {
      return `<button class="chapter-button" type="button" data-type="chapter" data-id="${escapeHtml(chapter.id)}">
        <span>${escapeHtml(chapter.chapterOrder || '')}. ${escapeHtml(chapter.chapterTitle || chapter.title)}</span>
        <small>${chapter.questions.length}문항</small>
      </button>`;
    }).join('');

    return `<details class="subject-group" open>
      <summary>
        <span>${escapeHtml(group.subjectTitle)}</span>
        <em>${group.chapters.length}개 챕터</em>
      </summary>
      <div class="subject-children">${chapterButtons}</div>
    </details>`;
  }).join('');

  const mockHtml = state.mockExams.map(exam => {
    return `<button class="chapter-button mock-button" type="button" data-type="mock" data-id="${escapeHtml(exam.id)}">
      <span>${escapeHtml(exam.title.replace('정보처리기사 필기 ', ''))}</span>
      <small>${exam.questions.length}문항</small>
    </button>`;
  }).join('');

  els.chapterList.innerHTML = `${subjectHtml}
    <details class="subject-group mock-group" open>
      <summary>
        <span>모의고사</span>
        <em>${state.mockExams.length}회차</em>
      </summary>
      <div class="subject-children">${mockHtml || '<p class="empty-nav">등록된 모의고사가 없습니다.</p>'}</div>
    </details>`;

  els.chapterList.querySelectorAll('.chapter-button').forEach(button => {
    button.addEventListener('click', () => selectItem(button.dataset.type, button.dataset.id));
  });
}

function groupBySubject(chapters) {
  const map = new Map();

  chapters.forEach(chapter => {
    const key = chapter.subjectId || 'etc';
    if (!map.has(key)) {
      map.set(key, {
        subjectId: key,
        subjectTitle: chapter.subjectTitle || '기타',
        subjectOrder: Number(chapter.subjectOrder || 99),
        chapters: []
      });
    }
    map.get(key).chapters.push(chapter);
  });

  return [...map.values()]
    .sort((a, b) => a.subjectOrder - b.subjectOrder)
    .map(group => ({
      ...group,
      chapters: group.chapters.sort((a, b) => Number(a.chapterOrder || 0) - Number(b.chapterOrder || 0))
    }));
}

function selectItem(type, id) {
  const item = type === 'mock'
    ? state.mockExams.find(exam => exam.id === id)
    : state.chapters.find(chapter => chapter.id === id);

  if (!item) return;

  state.selectedItem = { type, data: item };
  state.selectedAnswers = {};
  state.lastResult = null;

  els.chapterTitle.textContent = item.title;
  els.chapterSummary.textContent = item.summary;

  document.querySelectorAll('.chapter-button').forEach(button => {
    button.classList.toggle('active', button.dataset.type === type && button.dataset.id === id);
  });

  renderQuiz(item);
  renderEmptyAnalysis(type);

  if (type === 'mock') {
    renderMockMode(item);
    setActiveTab('quiz');
    return;
  }

  renderChapterMode(item);
  setActiveTab('lecture');
}

function renderChapterMode(chapter) {
  setTabVisibility('lecture', true);
  setTabVisibility('practice', true);
  renderLecture(chapter);
  renderPractice(chapter);
}

function renderMockMode(exam) {
  setTabVisibility('lecture', false);
  setTabVisibility('practice', false);
  els.lectureContent.innerHTML = '';
  els.practiceContent.innerHTML = '';
  const meta = exam.examInfo || {};
  els.quizForm.insertAdjacentHTML('afterbegin', `<section class="exam-notice">
    <h3>모의고사 풀이 안내</h3>
    <p>총 ${meta.totalQuestions || exam.questions.length}문항입니다. 과목별 ${meta.questionsPerSubject || 20}문항 구조로 채점되며, 분석 화면에서 과목별·챕터별·분야별 득점 상황을 확인합니다.</p>
    <p>합격 기준 분석은 평균 ${meta.passAverageScore || 60}점 이상, 과목별 ${meta.minSubjectScore || 40}점 미만 여부를 함께 표시합니다.</p>
  </section>`);
}

function setTabVisibility(tabName, visible) {
  const tab = [...els.tabs].find(item => item.dataset.tab === tabName);
  const panel = document.getElementById(`${tabName}Panel`);
  if (tab) tab.hidden = !visible;
  if (panel) panel.hidden = !visible;
}

function renderLecture(chapter) {
  const sections = Array.isArray(chapter.lecture?.sections) ? chapter.lecture.sections : [];
  els.lectureContent.innerHTML = `<h3>${escapeHtml(chapter.title)}</h3>` + sections.map(renderSection).join('');
}

function renderSection(section) {
  const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];
  const examples = [
    ...(Array.isArray(section.examples) ? section.examples : []),
    ...(Array.isArray(section.codeExamples) ? section.codeExamples : [])
  ];

  return `<section class="lecture-section">
    <h4>${escapeHtml(section.heading || '강의 내용')}</h4>
    ${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
    ${examples.map(renderCodeExample).join('')}
  </section>`;
}

function renderCodeExample(example) {
  if (!example || !example.code) return '';
  return `<div class="code-example">
    ${example.title ? `<h4>${escapeHtml(example.title)}</h4>` : ''}
    <pre><code>${escapeHtml(example.code)}</code></pre>
  </div>`;
}

function renderPractice(chapter) {
  const practice = chapter.practice;
  if (!practice) {
    els.practiceContent.innerHTML = '<p>이 챕터에는 별도 실습이 없습니다.</p>';
    return;
  }

  els.practiceContent.innerHTML = `<h3>${escapeHtml(practice.title || '실습')}</h3>
    ${(practice.description || []).map(item => `<p>${escapeHtml(item)}</p>`).join('')}
    <h4>실습 절차</h4>
    <ol class="practice-steps">${(practice.steps || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    ${practice.code ? renderCodeExample({ title: '실습 코드', code: practice.code }) : ''}`;
}

function renderQuiz(item) {
  els.quizForm.innerHTML = item.questions.map((question, index) => {
    const metaLine = [question.subject, question.chapter, question.topic].filter(Boolean).join(' · ');
    return `<section class="question-card">
      <div class="question-meta">${escapeHtml(metaLine)}</div>
      <h3>문제 ${index + 1}. ${escapeHtml(question.question)}</h3>
      ${Object.entries(question.choices).map(([key, value]) => {
        return `<label class="choice">
          <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(key)}" />
          ${escapeHtml(key)}. ${escapeHtml(value)}
        </label>`;
      }).join('')}
    </section>`;
  }).join('');

  els.quizForm.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      state.selectedAnswers[input.name] = input.value;
    });
  });
}

function gradeCurrentItem() {
  const selected = state.selectedItem;
  if (!selected) return;

  const item = selected.data;
  let correctCount = 0;

  const details = item.questions.map(question => {
    const userAnswer = state.selectedAnswers[question.id] || null;
    const isCorrect = userAnswer === question.answer;
    if (isCorrect) correctCount += 1;
    return { question, userAnswer, isCorrect };
  });

  state.lastResult = {
    type: selected.type,
    total: item.questions.length,
    correctCount,
    score: Math.round((correctCount / item.questions.length) * 100),
    details
  };

  renderAnalysis();
  setActiveTab('analysis');
}

function renderEmptyAnalysis(type = state.selectedItem?.type || 'chapter') {
  els.analysisContent.className = 'content-card empty-state';
  els.analysisContent.innerHTML = type === 'mock'
    ? '모의고사를 풀고 채점하면 과목별·챕터별·분야별 득점 분석이 표시됩니다.'
    : '문제를 풀고 채점하면 결과와 정답 해설이 표시됩니다.';
}

function renderAnalysis() {
  const result = state.lastResult;
  if (!result) {
    renderEmptyAnalysis();
    return;
  }

  els.analysisContent.className = 'content-card';

  if (result.type === 'mock') {
    els.analysisContent.innerHTML = renderMockAnalysis(result);
    return;
  }

  els.analysisContent.innerHTML = `<div class="result-summary">
    <h3>채점 결과</h3>
    <p>총 ${result.total}문항 중 <strong>${result.correctCount}문항</strong> 정답입니다.</p>
    <p>점수: <strong>${result.score}점</strong></p>
  </div>
  ${renderGuide(state.selectedItem?.data?.analysisGuide, result.score)}
  ${renderAnswerReview(result.details)}`;
}

function renderMockAnalysis(result) {
  const subjectStats = summarizeBy(result.details, item => item.question.subject || '기타');
  const chapterStats = summarizeBy(result.details, item => `${item.question.subject || '기타'} · ${item.question.chapter || '기타 챕터'}`);
  const topicStats = summarizeBy(result.details, item => `${item.question.subject || '기타'} · ${item.question.topic || '기타 분야'}`);
  const unanswered = result.details.filter(item => !item.userAnswer).length;
  const failedSubjects = subjectStats.filter(item => item.score < 40);
  const pass = result.score >= 60 && failedSubjects.length === 0;

  return `<div class="result-summary exam-result ${pass ? 'pass' : 'fail'}">
    <h3>모의고사 종합 결과</h3>
    <p>총 ${result.total}문항 중 <strong>${result.correctCount}문항</strong> 정답입니다. 평균 점수는 <strong>${result.score}점</strong>입니다.</p>
    <p>미응답 문항: <strong>${unanswered}문항</strong></p>
    <p>판정: <strong>${pass ? '합격권' : '보완 필요'}</strong></p>
    ${failedSubjects.length ? `<p>40점 미만 과목: ${escapeHtml(failedSubjects.map(item => item.label).join(', '))}</p>` : '<p>40점 미만 과목은 없습니다.</p>'}
  </div>
  <section class="analysis-block">
    <h3>과목별 득점 상황</h3>
    ${renderStatsGrid(subjectStats, true)}
  </section>
  <section class="analysis-block">
    <h3>챕터별 득점 상황</h3>
    ${renderStatsGrid(chapterStats, false)}
  </section>
  <section class="analysis-block">
    <h3>분야별 취약 영역 분석</h3>
    ${renderWeaknessList(topicStats)}
  </section>
  <section class="analysis-block">
    <h3>문항별 정답 해설</h3>
    ${renderAnswerReview(result.details)}
  </section>`;
}

function summarizeBy(details, keyFn) {
  const map = new Map();

  details.forEach(item => {
    const label = keyFn(item);
    if (!map.has(label)) {
      map.set(label, { label, total: 0, correct: 0, wrong: 0, unanswered: 0, score: 0 });
    }

    const stat = map.get(label);
    stat.total += 1;
    if (!item.userAnswer) stat.unanswered += 1;
    if (item.isCorrect) stat.correct += 1;
    else stat.wrong += 1;
  });

  return [...map.values()].map(stat => ({
    ...stat,
    score: Math.round((stat.correct / stat.total) * 100)
  })).sort((a, b) => a.score - b.score || b.total - a.total || a.label.localeCompare(b.label, 'ko'));
}

function renderStatsGrid(stats, keepOriginalOrder) {
  const list = keepOriginalOrder ? [...stats].sort((a, b) => subjectOrder(a.label) - subjectOrder(b.label)) : stats;

  return `<div class="stats-grid">
    ${list.map(stat => `<article class="stat-card ${stat.score < 40 ? 'danger' : stat.score < 60 ? 'warn' : 'stable'}">
      <h4>${escapeHtml(stat.label)}</h4>
      <p><strong>${stat.score}점</strong> · ${stat.correct}/${stat.total}문항 정답</p>
      <div class="progress-track"><span style="width:${stat.score}%"></span></div>
      <small>오답 ${stat.wrong}문항 · 미응답 ${stat.unanswered}문항</small>
    </article>`).join('')}
  </div>`;
}

function renderWeaknessList(stats) {
  const weakStats = stats.filter(stat => stat.score < 80).slice(0, 12);
  const target = weakStats.length ? weakStats : stats.slice(0, 12);

  return `<div class="weakness-list">
    ${target.map(stat => `<article class="weakness-card">
      <h4>${escapeHtml(stat.label)}</h4>
      <p>득점률 ${stat.score}점, 정답 ${stat.correct}/${stat.total}문항입니다.</p>
      <p>${stat.score < 60 ? '우선 복습 대상입니다. 개념 정의와 오답 선지의 범위 이탈 표현을 다시 확인합니다.' : '기본 이해는 있으나 실전 안정성을 위해 유사 개념 비교가 필요합니다.'}</p>
    </article>`).join('')}
  </div>`;
}

function subjectOrder(label) {
  const order = ['소프트웨어 설계', '소프트웨어 개발', '데이터베이스 구축', '프로그래밍 언어 활용', '정보시스템 구축관리'];
  const index = order.findIndex(item => label.includes(item));
  return index === -1 ? 99 : index;
}

function renderAnswerReview(details) {
  return details.map((item, index) => {
    const userAnswer = item.userAnswer ? `${item.userAnswer}. ${item.question.choices[item.userAnswer]}` : '미응답';
    const correctAnswer = `${item.question.answer}. ${item.question.choices[item.question.answer]}`;

    return `<div class="analysis-item ${item.isCorrect ? 'correct' : 'wrong'}">
      <div class="question-meta">${escapeHtml([item.question.subject, item.question.chapter, item.question.topic].filter(Boolean).join(' · '))}</div>
      <h4>문제 ${index + 1}. ${escapeHtml(item.question.question)}</h4>
      <p>내 답안: ${escapeHtml(userAnswer)}</p>
      <p>정답: ${escapeHtml(correctAnswer)}</p>
      <p>해설: ${escapeHtml(item.question.explanation || '')}</p>
      ${item.question.analysis ? `<p>분석: ${escapeHtml(item.question.analysis)}</p>` : ''}
    </div>`;
  }).join('');
}

function renderGuide(guide, score) {
  if (!guide) return '';
  const level = score >= 85 ? 'excellent' : score >= 65 ? 'good' : 'needsImprovement';

  return `<div class="result-summary">
    <h3>학습 분석</h3>
    <p>${escapeHtml(guide[level] || '')}</p>
    ${Array.isArray(guide.reviewFocus) ? `<p>복습 항목: ${escapeHtml(guide.reviewFocus.join(', '))}</p>` : ''}
  </div>`;
}

function resetAnswers() {
  state.selectedAnswers = {};
  state.lastResult = null;
  els.quizForm.reset();
  renderEmptyAnalysis(state.selectedItem?.type);
}

function bindTabs() {
  els.tabs.forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
  });
}

function setActiveTab(name) {
  const targetTab = [...els.tabs].find(tab => tab.dataset.tab === name);
  if (targetTab?.hidden) return;

  els.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === name));
  els.panels.forEach(panel => panel.classList.remove('active'));
  const targetPanel = document.getElementById(`${name}Panel`);
  if (targetPanel) targetPanel.classList.add('active');
}

function bindActions() {
  els.gradeBtn.addEventListener('click', gradeCurrentItem);
  els.resetBtn.addEventListener('click', resetAnswers);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
