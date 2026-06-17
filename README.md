# 📝 Todo List App

우선순위 관리와 드래그앤드롭 기능을 갖춘 Todo List 웹 애플리케이션입니다. Supabase Auth를 사용한 안전한 사용자 인증과 데이터 관리를 제공합니다.

## 🚀 빠른 시작

### 로컬에서 실행
```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

### GitHub Pages 데모
```
https://kwonyj0000.github.io/todo-list/
```

## ✨ 주요 기능

### 🔐 인증 시스템
- **회원가입**: 이메일 기반 회원가입 (비밀번호 또는 Magic Link)
- **로그인**: 이메일/비밀번호 또는 Magic Link 로그인
- **보안**: Supabase Auth 기반 안전한 인증
- **데이터 격리**: 사용자별 완전 분리된 데이터 관리

### 📋 할 일 관리
- **추가/수정/삭제**: 직관적인 할 일 CRUD
- **우선순위**: 높음/중간/낮음 3단계 우선순위
- **체크박스**: 완료/미완료 토글
- **필터링**: 우선순위별 필터링
- **드래그앤드롭**: 마우스로 순서 변경 및 우선순위 이동

### 💡 추가 기능
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원
- **실시간 동기화**: Supabase를 통한 자동 저장
- **알림 버튼**: 미완료 항목 알림 (백엔드 연동 예정)

## 🛠 기술 스택

### Frontend
- **Vanilla JavaScript** (ES6+)
- **HTML5** / **CSS3**
- **Google Fonts** (Roboto + Material Icons)
- No build tools, no frameworks

### Backend
- **Supabase Auth** (사용자 인증)
  - Magic Link 로그인
  - 이메일/비밀번호 로그인
  - 세션 관리
- **Supabase Database** (PostgreSQL)
  - Row Level Security (RLS)
  - RESTful API

### 배포
- **GitHub Pages** (정적 호스팅)

## 📂 프로젝트 구조

```
todo/
├── index.html              # 메인 페이지 (할 일 목록)
├── login.html              # 로그인 페이지
├── signup.html             # 회원가입 페이지
├── app.js                  # 메인 애플리케이션 로직
├── auth.js                 # 인증 관련 로직
├── style.css               # 스타일시트
├── README.md               # 사용 가이드 (이 파일)
├── CLAUDE.md               # Claude Code 작업 가이드
├── SUPABASE.md             # Supabase 설정 가이드
├── SUPABASE_AUTH.md        # Supabase Auth 구현 가이드
├── GITHUB_PAGES.md         # GitHub Pages 배포 가이드
├── MIGRATION_COMPLETE.md   # localStorage → Supabase 마이그레이션 기록
└── test-connection.html    # Supabase 연결 테스트 페이지
```

## 🗄 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### todos 테이블
```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚦 개발자를 위한 설정 가이드

### 사전 준비

- 웹 브라우저 (Chrome, Firefox, Safari 등)
- 로컬 웹 서버 (Python, Node.js 등)
- Supabase 계정 (무료 플랜 사용 가능)

### 1단계: 프로젝트 다운로드

```bash
git clone https://github.com/weable-kosa/kosa-vibecoding-2026-3rd.git
cd kosa-vibecoding-2026-3rd/src/exercise/kwonyj0000/day02/todo
```

### 2단계: Supabase 설정

#### 2-1. Supabase 프로젝트 생성
1. [supabase.com](https://supabase.com) 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 후 "Create new project" 클릭

#### 2-2. 데이터베이스 테이블 생성
1. Supabase Dashboard → SQL Editor
2. [SUPABASE.md](./SUPABASE.md)의 SQL 스크립트 실행
   - `users` 테이블 생성
   - `todos` 테이블 생성
   - RLS 정책 설정

#### 2-3. 인증 설정
1. Supabase Dashboard → Authentication → Providers
2. Email 프로바이더 활성화
3. "Confirm email" 옵션 해제 (개발용)
4. [SUPABASE_AUTH.md](./SUPABASE_AUTH.md) 참고하여 Magic Link 설정

#### 2-4. API 키 설정
1. Supabase Dashboard → Project Settings → API
2. `Project URL`과 `anon public` 키 복사
3. `app.js`와 `auth.js`에서 아래 부분 수정:
   ```javascript
   const SUPABASE_URL = '여기에-Project-URL-입력';
   const SUPABASE_ANON_KEY = '여기에-anon-key-입력';
   ```

### 3단계: 로컬 서버 실행

```bash
# Python 사용 시
python3 -m http.server 8000

# 또는 Node.js 사용 시
npx http-server -p 8000
```

브라우저에서 http://localhost:8000 접속

### 4단계: 테스트

1. `test-connection.html` 열어서 Supabase 연결 확인
2. 회원가입 → 로그인 → 할 일 추가 → 드래그앤드롭 테스트

### 상세 문서

- [SUPABASE.md](./SUPABASE.md) - Supabase 데이터베이스 설정
- [SUPABASE_AUTH.md](./SUPABASE_AUTH.md) - 인증 시스템 구현
- [GITHUB_PAGES.md](./GITHUB_PAGES.md) - GitHub Pages 배포
- [CLAUDE.md](./CLAUDE.md) - 개발 가이드

## 📖 사용 가이드

### 1단계: 회원가입 또는 로그인

#### 회원가입
1. 앱 접속 후 "회원가입" 페이지로 이동
2. 이메일 주소 입력
3. 두 가지 방법 중 선택:
   - **비밀번호 방식**: 비밀번호(6자 이상) 입력 후 "회원가입" 클릭
   - **Magic Link 방식**: "Magic Link로 가입" 클릭 → 이메일에서 링크 확인

#### 로그인
1. "로그인" 페이지에서 이메일 입력
2. 두 가지 방법 중 선택:
   - **비밀번호 방식**: 비밀번호 입력 후 "로그인" 클릭
   - **Magic Link 방식**: "Magic Link 전송" 클릭 → 이메일에서 링크 확인

### 2단계: 할 일 추가

1. 로그인 후 메인 화면에서 할 일 입력란에 내용 입력
2. 우선순위 선택 (낮음/중간/높음)
3. "추가" 버튼 클릭

### 3단계: 할 일 관리

#### 완료 체크
- 체크박스 클릭으로 완료/미완료 토글
- 완료된 항목은 회색으로 표시됨

#### 순서 변경 (드래그앤드롭)
- 왼쪽 `⋮⋮` 핸들을 드래그하여 순서 변경
- **같은 우선순위 내 이동**: 순서만 변경
- **다른 우선순위로 이동**: 우선순위도 자동 변경

#### 삭제
- 각 항목 오른쪽의 "삭제" 버튼 클릭

### 4단계: 필터링

- 우측 상단 필터 드롭다운에서 우선순위 선택
- **전체**: 모든 할 일 표시
- **높음/중간/낮음**: 해당 우선순위만 표시

### 5단계: 로그아웃

- 우측 상단 "로그아웃" 버튼 클릭

## 🎨 주요 코드 컨벤션

### 명명 규칙
- 상수: `UPPER_SNAKE_CASE` (예: `PRIORITY_ORDER`)
- 함수: `camelCase` (예: `addTodo`, `renderTodos`)
- 변수: `camelCase`

### 우선순위 값
- `'high'`: 높음
- `'medium'`: 중간 (기본값)
- `'low'`: 낮음

### HTML 보안
- 사용자 입력은 항상 `escapeHtml()` 함수로 이스케이프
- XSS 공격 방지

## 📝 개발 히스토리

### Phase 1: 기본 구조 (2026-06-14)
- Vanilla JavaScript로 기본 Todo 앱 구현
- localStorage 기반 데이터 저장
- 드래그앤드롭, 우선순위 관리 기능

### Phase 2: Supabase Database (2026-06-15)
- localStorage → Supabase PostgreSQL 전환
- 익명 사용자 기반 이메일 식별
- RLS 정책 적용
- async/await 기반 API 호출

### Phase 3: Supabase Auth (2026-06-17)
- Supabase Auth 통합
- 회원가입/로그인 페이지 구현
- Magic Link 로그인 지원
- RLS 정책 강화 (`auth.uid()` 기반)

### Phase 4: GitHub Pages 배포 (예정)
- 정적 호스팅 설정
- OAuth 콜백 URL 설정
- 커스텀 도메인 (선택)

## 🔒 보안

### 현재 구현된 보안 기능
- **Supabase Auth**: 안전한 이메일 기반 인증
- **Row Level Security (RLS)**: 사용자별 데이터 격리
  ```sql
  -- 사용자는 자신의 할 일만 조회/수정/삭제 가능
  USING (auth.uid() = user_id)
  ```
- **XSS 방지**: 사용자 입력 HTML 이스케이프 처리
- **세션 관리**: Supabase 자동 세션 관리
- **HTTPS**: GitHub Pages 자동 적용

### 추가 보안 권장사항 (프로덕션)
- 이메일 인증 강제
- Rate limiting (API 호출 제한)
- CSP (Content Security Policy) 헤더 설정
- OAuth 소셜 로그인 추가

## 🐛 문제 해결 (Troubleshooting)

### 로그인이 안 돼요
**증상**: 로그인 버튼을 눌러도 반응이 없거나 오류 발생

**해결 방법**:
1. 브라우저 콘솔(F12)에서 에러 메시지 확인
2. Supabase Dashboard → Authentication → Users에서 사용자 생성 확인
3. `app.js`와 `auth.js`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 확인
4. Supabase Dashboard → Authentication → Providers에서 Email 활성화 확인

### Magic Link 이메일이 안 와요
**증상**: Magic Link 전송했는데 이메일이 오지 않음

**해결 방법**:
1. 스팸 메일함 확인
2. Supabase Dashboard → Authentication → Email Templates 확인
3. 개발 중에는 Supabase Dashboard → Authentication → Users에서 "Email Verification" 확인 필요
4. [SUPABASE_AUTH.md](./SUPABASE_AUTH.md)의 "Email 설정" 섹션 참고

### 할 일이 저장되지 않아요
**증상**: 할 일 추가해도 새로고침하면 사라짐

**해결 방법**:
1. 로그인 상태 확인 (로그아웃 버튼이 보이는지)
2. 브라우저 콘솔에서 네트워크 오류 확인
3. Supabase Dashboard → Table Editor → todos에서 데이터 생성 확인
4. RLS 정책 확인 (자세한 내용은 [SUPABASE.md](./SUPABASE.md) 참고)

### 드래그앤드롭이 작동하지 않아요
**증상**: 할 일을 드래그할 수 없거나 드롭해도 순서가 변경되지 않음

**해결 방법**:
1. 왼쪽 `⋮⋮` 핸들을 드래그하는지 확인 (텍스트 드래그 불가)
2. 브라우저가 최신 버전인지 확인 (Chrome, Firefox, Safari 권장)
3. 브라우저 콘솔에서 JavaScript 오류 확인

### Supabase 연결 테스트
```bash
# 로컬 서버 실행 후
# http://localhost:8000/test-connection.html 접속
```

- 초록색 체크: 연결 성공
- 빨간색 X: 설정 오류 (콘솔 메시지 확인)

## 📚 참고 문서

### 사용자용
- **README.md** (이 파일) - 앱 사용 및 설정 가이드

### 개발자용
- [CLAUDE.md](./CLAUDE.md) - Claude Code 개발 가이드
- [SUPABASE.md](./SUPABASE.md) - Supabase 데이터베이스 설정
- [SUPABASE_AUTH.md](./SUPABASE_AUTH.md) - Supabase Auth 구현 상세
- [GITHUB_PAGES.md](./GITHUB_PAGES.md) - GitHub Pages 배포
- [MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md) - 마이그레이션 기록

### 외부 문서
- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [MDN Web Docs - Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)

## 💡 자주 묻는 질문 (FAQ)

### Q: 무료로 사용할 수 있나요?
**A**: 네! Supabase 무료 플랜으로 충분히 사용 가능합니다.
- 500MB 데이터베이스
- 월 5GB 대역폭
- 50,000 MAU (Monthly Active Users)

### Q: 여러 기기에서 사용할 수 있나요?
**A**: 네! 로그인하면 모든 기기에서 동일한 할 일을 볼 수 있습니다.

### Q: 오프라인에서도 사용할 수 있나요?
**A**: 현재는 인터넷 연결이 필요합니다. 향후 Service Worker를 추가하면 오프라인 지원 가능합니다.

### Q: 데이터는 안전하게 보관되나요?
**A**: Supabase는 PostgreSQL 기반으로 안전하게 데이터를 저장하며, RLS 정책으로 다른 사용자가 내 데이터를 볼 수 없습니다.

### Q: 모바일 앱도 있나요?
**A**: 현재는 웹 앱만 제공되지만, 반응형 디자인으로 모바일 브라우저에서도 잘 작동합니다.

## 🤝 기여

이 프로젝트는 KOSA Vibecoding 교육 과정의 일환으로 제작되었습니다.

## 📄 라이선스

MIT License

## 👤 작성자

- **작성자**: KwonYJ
- **GitHub**: [@kwonyj0000](https://github.com/kwonyj0000)
- **프로젝트**: KOSA Vibecoding 2026 3rd
- **이메일**: 문의 사항은 GitHub Issues를 이용해주세요

## 🙏 감사

- [Supabase](https://supabase.com) - 백엔드 인프라 및 인증
- [GitHub Pages](https://pages.github.com) - 정적 호스팅
- [Claude Code](https://claude.ai/code) - AI 기반 개발 지원
- [Google Fonts](https://fonts.google.com) - Roboto 폰트 및 Material Icons

---

**⭐ 이 프로젝트가 도움이 되셨다면 GitHub Star를 눌러주세요!**
