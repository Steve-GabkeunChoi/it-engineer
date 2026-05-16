# 정보처리기사 강의 실습 문제풀이 프로젝트

정보처리기사 필기 5과목을 과목별 챕터 구조로 학습하고, 모의고사 풀이 후 과목별·챕터별·분야별 득점 상황을 분석하는 정적 웹 프로젝트이다.

## 주요 변경 사항

- 좌측 사이드바를 과목 중심 구조로 변경했다.
- 과목 하위에 각 챕터가 표시되도록 구성했다.
- 각 챕터별 문항 수를 50문항으로 구성했다.
- 모의고사는 강의와 실습 탭을 표시하지 않고 문제풀이, 채점 및 분석만 제공한다.
- 모의고사 분석은 과목별 점수, 챕터별 점수, 분야별 취약 영역, 문항별 해설을 제공한다.
- 모의고사는 `data/mock-exams/mock-exam-1.json`, `mock-exam-2.json` 형식으로 회차별 파일을 분리했다.
- 새 회차를 추가할 때 `mock-exam-6.json`처럼 다음 번호 파일을 추가하면 화면에서 자동 로드된다.

## 폴더 구조

```text
it-engineer-cert-course/
  index.html
  css/
    style.css
  js/
    app.js
  data/
    manifest.json
    chapters/
      index.json
      sw-design-*.json
      sw-development-*.json
      database-*.json
      programming-*.json
      system-management-*.json
    mock-exams/
      mock-exam-1.json
      mock-exam-2.json
      mock-exam-3.json
      mock-exam-4.json
      mock-exam-5.json
```

## 데이터 구성

| 구분 | 수량 |
|---|---:|
| 필기 과목 | 5과목 |
| 과목별 챕터 | 총 20개 |
| 챕터별 문제 | 50문항 |
| 챕터 문제 합계 | 1,000문항 |
| 모의고사 회차 | 5회 |
| 모의고사 회차별 문제 | 100문항 |
| 모의고사 문제 합계 | 500문항 |
| 전체 문제 | 1,500문항 |

## 모의고사 JSON 확장 방식

모의고사는 별도 index 파일을 사용하지 않는다. 브라우저에서 다음 순서로 파일을 자동 조회한다.

```text
data/mock-exams/mock-exam-1.json
data/mock-exams/mock-exam-2.json
data/mock-exams/mock-exam-3.json
...
```

연속된 번호의 파일이 존재하는 동안 자동으로 로드한다. 6회차를 추가하려면 다음 파일만 추가하면 된다.

```text
data/mock-exams/mock-exam-6.json
```

단, `mock-exam-6.json` 없이 `mock-exam-7.json`만 추가하면 7회차는 로드되지 않는다. 회차 번호는 연속되어야 한다.

## 실행 방법

정적 파일을 브라우저에서 바로 열면 fetch 제한이 발생할 수 있으므로 간단한 로컬 서버로 실행한다.

```bash
python3 -m http.server 8000
```

브라우저에서 다음 주소로 접속한다.

```text
http://localhost:8000
```

Node.js 환경에서는 다음 명령도 사용할 수 있다.

```bash
npx serve .
```

## JSON 필수 구조

챕터 JSON은 다음 필드를 포함한다.

```json
{
  "id": "sw-design-requirements-analysis",
  "type": "chapter",
  "subjectId": "sw-design",
  "subjectTitle": "소프트웨어 설계",
  "chapterTitle": "요구사항 확인과 분석",
  "lecture": {
    "sections": []
  },
  "practice": {},
  "questions": []
}
```

모의고사 JSON은 다음 필드를 포함한다.

```json
{
  "id": "mock-exam-1",
  "type": "mock",
  "round": 1,
  "title": "정보처리기사 필기 모의고사 1회",
  "summary": "...",
  "examInfo": {
    "subjectCount": 5,
    "questionsPerSubject": 20,
    "totalQuestions": 100,
    "passAverageScore": 60,
    "minSubjectScore": 40
  },
  "questions": []
}
```

모의고사 분석을 위해 각 문항에는 다음 태그를 포함하는 것이 좋다.

```json
{
  "subject": "데이터베이스 구축",
  "chapter": "SQL 기본과 응용",
  "topic": "JOIN"
}
```


## v3 강의 내용 보강 내역

각 과목의 챕터 강의 내용을 문제풀이가 가능한 수준으로 확장했습니다. 챕터별 강의는 핵심 개념, 출제 포인트, 예제, 오답 유형, 실기 연결, 채점 후 분석 방법을 포함합니다. 챕터 문제는 기존처럼 50문항 구조를 유지하며, 모의고사는 `data/mock-exams/mock-exam-번호.json` 파일을 추가하는 방식으로 회차를 확장할 수 있습니다.


## v4 강의 본문 보강 내용

각 과목 챕터의 강의 본문을 문제풀이 중심으로 대폭 확장했다. 각 챕터는 핵심 용어 지도, 세부 개념 설명, 문제풀이 판별 기준, 대표 예제, 오답 유형, 실기 연결 포인트, 50문항 풀이 전 점검표를 포함한다. 기존 메뉴 구조, 모의고사 회차별 JSON 자동 확장 구조, 챕터별 50문항 구조는 유지했다.
