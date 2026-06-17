# Supabase Auth 회원가입 및 이메일 인증 가이드

이 문서는 Supabase Auth를 사용하여 Todo 앱에 회원가입 및 이메일 인증 기능을 추가하는 방법을 설명합니다.

## 개요

기존의 단순 이메일 기반 식별 시스템을 Supabase Auth로 전환하여:
- **보안 강화**: RLS 정책으로 인증된 사용자만 자신의 데이터 접근
- **사용자 경험 개선**: Magic Link를 통한 비밀번호 없는 간편 로그인
- **데이터 무결성**: Supabase Auth의 `auth.users` 테이블과 연동

## 구현 방식

- **인증 방식**: Magic Link (이메일로 로그인 링크 전송)
- **UI 구조**: 별도 페이지 (login.html, signup.html)
- **기존 데이터**: 테이블 구조 변경 필요 (초기화 권장)

---

## 1단계: Supabase Dashboard 설정

### 1.1 Email Auth 활성화

1. Supabase Dashboard 접속
2. 프로젝트 선택
3. **Authentication** → **Providers** 메뉴
4. **Email** 프로바이더 설정:
   - **Enable Email provider**: ON
   - **Enable Magic Link**: ON
   - **Confirm email**: ON
   - **Secure email change**: ON

### 1.2 Email Templates

**Authentication** → **Email Templates**에서 템플릿 확인:

- **Magic Link**: 로그인 링크 전송용
- **Confirm signup**: 회원가입 인증용

기본 템플릿을 사용하거나 브랜드에 맞게 커스터마이징 가능

### 1.3 Site URL 설정

**Authentication** → **URL Configuration**:

- **Site URL**: 
  - 개발: `http://localhost:8001`
  - 프로덕션: 배포 URL (예: GitHub Pages URL)
- **Redirect URLs**: Site URL과 동일하게 추가

---

## 2단계: Database Schema 수정

### 2.1 테이블 재생성

**중요**: 기존 데이터가 삭제됩니다. 필요시 백업 후 진행하세요.

```sql
-- 기존 테이블 삭제
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- users 테이블 (auth.users와 연동)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- todos 테이블
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

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_user_priority_order ON todos(user_id, priority, "order");

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**핵심 변경사항**:
- `users.id`가 `auth.users(id)`를 참조하는 외래키
- `auth.users`는 Supabase Auth가 자동 관리

### 2.2 RLS 정책 설정

```sql
-- users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- todos 테이블 RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);
```

### 2.3 자동 사용자 생성 트리거

회원가입 시 `public.users` 테이블에 자동으로 레코드 생성:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**동작 원리**:
- Supabase Auth 회원가입 → `auth.users`에 INSERT
- 트리거 발동 → `public.users`에 자동 INSERT
- 프론트엔드에서 별도 INSERT 불필요

---

## 3단계: 프론트엔드 파일 생성

### 3.1 로그인 페이지 (login.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - Todo List</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container auth-container">
        <header>
            <h1>Todo List 로그인</h1>
        </header>
        <main>
            <section class="card">
                <div class="card-header">
                    <h2>이메일로 로그인</h2>
                </div>
                <div class="card-content">
                    <form id="login-form">
                        <div class="form-group">
                            <input type="email" id="login-email" 
                                   placeholder="example@email.com" required>
                            <button type="submit" class="btn btn-primary">
                                Magic Link 전송
                            </button>
                        </div>
                    </form>
                    <div id="message" class="message"></div>
                    <p class="auth-link">
                        계정이 없으신가요? <a href="signup.html">회원가입</a>
                    </p>
                </div>
            </section>
        </main>
    </div>
    <script src="auth.js"></script>
</body>
</html>
```

### 3.2 회원가입 페이지 (signup.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - Todo List</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container auth-container">
        <header>
            <h1>Todo List 회원가입</h1>
        </header>
        <main>
            <section class="card">
                <div class="card-header">
                    <h2>이메일로 가입하기</h2>
                </div>
                <div class="card-content">
                    <form id="signup-form">
                        <div class="form-group">
                            <input type="email" id="signup-email" 
                                   placeholder="example@email.com" required>
                            <button type="submit" class="btn btn-primary">
                                가입하기
                            </button>
                        </div>
                    </form>
                    <div id="message" class="message"></div>
                    <p class="auth-link">
                        이미 계정이 있으신가요? <a href="login.html">로그인</a>
                    </p>
                </div>
            </section>
        </main>
    </div>
    <script src="auth.js"></script>
</body>
</html>
```

### 3.3 인증 로직 (auth.js)

```javascript
// Supabase 설정
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message message-${type}`;
}

async function handleSignup(email) {
    if (!isValidEmail(email)) {
        showMessage('올바른 이메일 형식을 입력해주세요.', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/index.html`
            }
        });

        if (error) throw error;
        showMessage('가입 확인 이메일이 전송되었습니다.', 'success');
    } catch (error) {
        console.error('회원가입 오류:', error);
        showMessage(`회원가입 실패: ${error.message}`, 'error');
    }
}

async function handleLogin(email) {
    if (!isValidEmail(email)) {
        showMessage('올바른 이메일 형식을 입력해주세요.', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/index.html`
            }
        });

        if (error) throw error;
        showMessage('로그인 링크가 이메일로 전송되었습니다.', 'success');
    } catch (error) {
        console.error('로그인 오류:', error);
        showMessage(`로그인 실패: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value.trim();
            await handleSignup(email);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            await handleLogin(email);
        });
    }
});
```

---

## 4단계: 기존 파일 수정

### 4.1 index.html 수정

**변경사항**:
1. 이메일 입력 폼 섹션 제거
2. 헤더에 로그아웃 버튼 추가
3. 로딩 표시 추가

```html
<header>
    <h1>오늘 할 일</h1>
    <div class="header-actions">
        <span id="user-email-display"></span>
        <button id="logout-btn" class="btn btn-text">로그아웃</button>
    </div>
</header>

<main>
    <div id="loading" class="loading" style="display: none;">
        <p>로딩 중...</p>
    </div>
    <!-- 기존 내용 유지 -->
</main>
```

### 4.2 app.js 수정

**주요 변경사항**:

1. **전역 변수**:
```javascript
let todos = [];
let currentUser = null; // auth.user 객체 저장
let currentFilter = 'all';
```

2. **인증 확인**:
```javascript
async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        window.location.href = 'login.html';
        return null;
    }

    currentUser = session.user;
    return currentUser;
}
```

3. **로그아웃**:
```javascript
async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}
```

4. **데이터 함수 수정**:
- `userId` → `currentUser.id` 변경
- `loadTodos()`, `addTodo()`, `toggleTodo()`, `deleteTodo()` 등 모든 함수에서 `currentUser.id` 사용

5. **DOMContentLoaded**:
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    document.getElementById('user-email-display').textContent = user.email;
    
    await loadTodos();
    renderTodos();

    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    // ... 기존 이벤트 리스너 유지
});
```

6. **삭제할 함수**:
- `saveUserEmail()`
- `loadUserEmail()`
- `updateUserEmailDisplay()`
- 이메일 폼 관련 코드

### 4.3 style.css 추가

```css
/* Auth 페이지 */
.auth-container {
    max-width: 500px;
    margin: 0 auto;
}

/* 메시지 */
.message {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 4px;
}

.message-success {
    background-color: #d4edda;
    color: #155724;
}

.message-error {
    background-color: #f8d7da;
    color: #721c24;
}

/* Auth 링크 */
.auth-link {
    text-align: center;
    margin-top: 1.5rem;
    color: #666;
}

.auth-link a {
    color: #007bff;
}

/* 헤더 액션 */
.header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
}

#user-email-display {
    font-size: 0.9rem;
    color: #666;
}

/* 로딩 */
.loading {
    text-align: center;
    padding: 2rem;
}
```

---

## 인증 흐름

### 회원가입 흐름

1. 사용자가 signup.html에서 이메일 입력
2. `signUp()` 호출 → Supabase가 확인 이메일 전송
3. 사용자가 이메일 링크 클릭 → 이메일 인증 완료
4. 트리거가 `public.users`에 레코드 자동 생성
5. 이후 로그인 가능

### Magic Link 로그인 흐름

1. 사용자가 login.html에서 이메일 입력
2. `signInWithOtp()` 호출 → Supabase가 Magic Link 전송
3. 사용자가 링크 클릭 → 자동 로그인
4. index.html로 리다이렉트
5. `checkAuth()`로 세션 확인 후 앱 진입

### 세션 관리

- Supabase가 자동으로 세션 관리
- 브라우저 재시작해도 세션 유지
- `getSession()`으로 현재 세션 확인
- `signOut()`으로 로그아웃

---

## 테스트 방법

### 1. Supabase Dashboard 확인

- **Authentication** → **Users**: 가입된 사용자 확인
- **Table Editor** → **users**: 자동 생성된 레코드 확인
- **Table Editor** → **todos**: `user_id`가 올바르게 저장되었는지 확인

### 2. 로컬 테스트

```bash
python3 -m http.server 8001
# 브라우저에서 localhost:8001/signup.html 접속
```

**테스트 시나리오**:
1. 회원가입 → 이메일 인증 링크 클릭
2. 로그인 → Magic Link 클릭
3. index.html 접속 → 이메일 표시 확인
4. 할 일 CRUD → Supabase 저장 확인
5. 로그아웃 → login.html로 이동 확인
6. 인증 없이 index.html 접속 → login.html로 리다이렉트
7. 다른 계정으로 로그인 → 데이터 분리 확인

### 3. RLS 정책 확인

```sql
-- SQL Editor에서 실행
SELECT * FROM pg_policies WHERE tablename IN ('users', 'todos');
SELECT auth.uid();
```

---

## 문제 해결

### 이메일이 전송되지 않음

- Supabase Dashboard → **Authentication** → **Email Templates** 확인
- SMTP 설정 확인 (기본적으로 Supabase 제공)
- 스팸 폴더 확인

### RLS 오류

- `new row violates row-level security policy` 에러:
  - RLS 정책이 올바르게 설정되었는지 확인
  - `auth.uid()`가 올바른 값을 반환하는지 확인

### 세션 오류

- 브라우저 쿠키/캐시 삭제 후 재시도
- 시크릿 모드에서 테스트

---

## 보안 고려사항

### API 키 관리

- `anon` (public) 키만 클라이언트에 노출
- `service_role` 키는 절대 클라이언트에 포함 금지
- RLS 정책으로 서버 레벨 보안 보장

### RLS 정책

- 인증된 사용자만 자신의 데이터 접근
- `auth.uid() = user_id` 조건으로 필터링
- 모든 테이블에 RLS 활성화

### HTTPS

- 프로덕션에서는 반드시 HTTPS 사용
- Supabase가 기본적으로 HTTPS 제공

---

## 향후 개선 방안

### 인증 방식 추가

- OAuth 로그인 (Google, GitHub 등)
- 비밀번호 기반 로그인
- 소셜 로그인

### 사용자 프로필

- 프로필 이미지
- 닉네임
- 사용자 설정

### 이메일 템플릿

- 브랜드 로고 추가
- 커스텀 디자인
- 다국어 지원

---

## 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Magic Link 가이드](https://supabase.com/docs/guides/auth/auth-magic-link)
- [RLS 정책 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)
