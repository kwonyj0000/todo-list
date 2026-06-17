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

## 5단계: 소셜 로그인 (Google / GitHub) 설정

기존 Magic Link 방식 위에 Google·GitHub 소셜 로그인을 추가합니다. 프론트엔드는 Supabase의 `signInWithOAuth()`를 사용하며, **실제 동작을 위해서는 아래 대시보드 설정이 반드시 선행되어야 합니다.**

### 5.0 콜백(Callback) URL 개념

모든 OAuth 공급자는 인증 완료 후 Supabase의 고정 콜백 주소로 사용자를 돌려보냅니다. 이 주소를 각 공급자 콘솔에 등록해야 합니다.

```
https://<프로젝트-ref>.supabase.co/auth/v1/callback
```

현재 프로젝트 기준:

```
https://bmarqwvqkvegnqzbdwlo.supabase.co/auth/v1/callback
```

> 흐름: 앱 → 공급자(구글/깃허브) 로그인 → **Supabase 콜백 URL** → 앱의 `redirectTo`(index.html)

### 5.1 Google OAuth 설정

#### (1) Google Cloud Console에서 OAuth 클라이언트 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속 후 프로젝트 생성/선택
2. **APIs & Services** → **OAuth consent screen**
   - User Type: **External** 선택 후 앱 이름·지원 이메일 등 필수 항목 입력
   - 테스트 단계라면 **Test users**에 로그인할 계정 추가
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**: 앱 실행 주소 추가
     - 개발: `http://localhost:8001`
     - 프로덕션: 배포 URL
   - **Authorized redirect URIs**: Supabase 콜백 URL 추가
     ```
     https://bmarqwvqkvegnqzbdwlo.supabase.co/auth/v1/callback
     ```
4. 생성된 **Client ID**와 **Client Secret** 복사

#### (2) Supabase에 Google 공급자 등록

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** 선택 → **Enable Sign in with Google**: ON
3. **Client ID**, **Client Secret** 붙여넣기 → **Save**

### 5.2 GitHub OAuth 설정

#### (1) GitHub에서 OAuth App 생성

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. 항목 입력:
   - **Application name**: 임의의 앱 이름 (예: Todo List)
   - **Homepage URL**: 앱 실행 주소 (예: `http://localhost:8001`)
   - **Authorization callback URL**: Supabase 콜백 URL
     ```
     https://bmarqwvqkvegnqzbdwlo.supabase.co/auth/v1/callback
     ```
3. **Register application** 클릭
4. **Client ID** 확인 후 **Generate a new client secret**으로 Secret 발급·복사

#### (2) Supabase에 GitHub 공급자 등록

1. Supabase Dashboard → **Authentication** → **Providers**
2. **GitHub** 선택 → **Enable Sign in with GitHub**: ON
3. **Client ID**, **Client Secret** 붙여넣기 → **Save**

### 5.3 Redirect URL 허용 목록 확인

소셜 로그인 후 앱으로 돌아오는 주소(`redirectTo`)가 허용 목록에 없으면 리다이렉트가 차단됩니다.

**Authentication** → **URL Configuration** → **Redirect URLs**에 다음을 추가:

- 개발: `http://localhost:8001/index.html`
- 프로덕션: `https://<배포-도메인>/index.html` (예: GitHub Pages URL)

### 5.4 프론트엔드 연동 코드

소셜 로그인 버튼은 `data-oauth-provider` 속성으로 공급자를 지정하며, `auth.js`가 클릭 이벤트를 자동 바인딩합니다.

```html
<!-- login.html / signup.html 공통 -->
<div class="social-login">
    <button type="button" class="btn btn-social btn-google" data-oauth-provider="google">
        Google로 계속하기
    </button>
    <button type="button" class="btn btn-social btn-github" data-oauth-provider="github">
        GitHub로 계속하기
    </button>
</div>
```

```javascript
// auth.js
async function handleSocialLogin(provider) {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider, // 'google' | 'github'
            options: {
                redirectTo: `${window.location.origin}/index.html`
            }
        });
        if (error) throw error;
        // 성공 시 Supabase가 공급자 인증 페이지로 자동 리다이렉트
    } catch (error) {
        console.error('소셜 로그인 오류:', error);
        showMessage(`소셜 로그인 실패: ${error.message}`, 'error');
    }
}

// 소셜 로그인 버튼 자동 바인딩
document.querySelectorAll('[data-oauth-provider]').forEach((btn) => {
    btn.addEventListener('click', () => handleSocialLogin(btn.dataset.oauthProvider));
});
```

> 로그인 성공 후 세션은 기존 `app.js`의 `checkAuth()`(`getSession`)가 그대로 처리하므로 추가 작업이 필요 없습니다. Supabase 클라이언트가 리다이렉트 URL의 토큰을 자동으로 세션으로 변환합니다.

### 5.5 소셜 로그인 테스트 시나리오

1. `python3 -m http.server 8001` 실행 후 `localhost:8001/login.html` 접속
2. **Google로 계속하기** 클릭 → 구글 동의 화면 → 승인 → index.html 진입 확인
3. **GitHub로 계속하기** 클릭 → 깃허브 인증 → 승인 → index.html 진입 확인
4. Supabase Dashboard → **Authentication** → **Users**에서 공급자(`provider`)가 google/github로 표시되는지 확인
5. `public.users` 테이블에 트리거로 레코드가 자동 생성되었는지 확인

### 5.6 소셜 로그인 문제 해결

| 증상 | 원인 / 해결 |
|------|-------------|
| `redirect_uri_mismatch` | 공급자 콘솔의 콜백 URL이 Supabase 콜백 URL과 정확히 일치하지 않음 (오타·슬래시 확인) |
| `Unsupported provider` | Supabase Providers에서 해당 공급자가 Enable되어 있지 않음 |
| 로그인 후 login.html로 되돌아감 | **Redirect URLs** 목록에 `redirectTo` 주소가 없음 |
| Google "앱이 차단됨" | OAuth consent screen이 테스트 모드 → Test users에 계정 추가 또는 앱 게시 |
| GitHub 이메일 없음 | GitHub 계정 이메일이 비공개 → 공개 이메일 설정 또는 별도 처리 필요 |

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

### 소셜 로그인 흐름

1. 사용자가 login.html에서 **Google / GitHub로 계속하기** 클릭
2. `signInWithOAuth()` 호출 → 공급자 인증 페이지로 리다이렉트
3. 사용자가 공급자에서 로그인·동의
4. 공급자 → Supabase 콜백 URL → 앱의 `redirectTo`(index.html)로 복귀
5. Supabase 클라이언트가 토큰을 세션으로 변환 → `checkAuth()`로 앱 진입
6. 최초 로그인 시 트리거가 `public.users`에 레코드 자동 생성

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

- ✅ OAuth 소셜 로그인 (Google, GitHub) — 5단계 참고 (구현 완료)
- 추가 소셜 공급자 (Kakao, Apple 등)
- 비밀번호 기반 로그인

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
