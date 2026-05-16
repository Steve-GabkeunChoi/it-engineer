# Python 학습 과정 정적 웹 앱

GitHub Pages에 업로드해서 사용할 수 있는 Python 학습용 정적 웹 앱이다.

## 구성

- 챕터 선택
- 강의 내용
- 실습 코드
- 4지선다형 문제풀이
- 자동 채점
- 문항별 정답 해설
- 학습 분석

## 실행

로컬에서 JSON 파일을 읽어야 하므로 간단한 정적 서버로 실행한다.

```bash
python3 -m http.server 8000
```

브라우저에서 다음 주소로 접속한다.

```text
http://localhost:8000
```

## 챕터 확장

`data/chapters/`에 JSON 파일을 추가하고 `data/chapters/index.json`의 modules 배열에 파일명을 등록한다.

## JSON 구조

각 챕터는 다음 구조를 사용한다.

```json
{
  "id": "chapter-id",
  "order": 1,
  "title": "챕터명",
  "summary": "요약",
  "lecture": {
    "sections": [
      {
        "heading": "소제목",
        "paragraphs": ["설명 문단"],
        "codeExamples": [{ "title": "예제", "code": "print('hello')" }]
      }
    ]
  },
  "practice": {
    "title": "실습명",
    "description": [],
    "steps": [],
    "code": "실습 코드"
  },
  "questions": [],
  "analysisGuide": {}
}
```
