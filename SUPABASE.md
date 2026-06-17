# Supabase 마이그레이션 가이드

이 문서는 localStorage 기반 Todo 앱을 Supabase로 마이그레이션하기 위한 설정 및 구조 가이드입니다.

## 1. Supabase 프로젝트 생성

### 1.1 회원가입 및 프로젝트 생성
1. [Supabase](https://supabase.com) 방문
2. "Start your project" 클릭하여 회원가입 (GitHub 연동 추천)
3. "New Project" 클릭
4. 프로젝트 정보 입력:
   - **Name**: `todo-app` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (기억할 것!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (가장 가까운 리전)
   - **Pricing Plan**: Free tier 선택

### 1.2 프로젝트 설정 확인
프로젝트 생성 후 다음 정보를 확인:
- **Settings** → **API** 메뉴에서:
  - `Project URL`: `https://xxxxx.supabase.co`
  - `anon public` API key: 클라이언트에서 사용할 공개 키

## 2. 데이터베이스 테이블 구조

### 2.1 `users` 테이블
사용자 이메일을 관리하는 테이블입니다.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 이메일 인덱스
CREATE INDEX idx_users_email ON users(email);

-- updated_at 자동 업데이트 트리거
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
```

### 2.2 `todos` 테이블
할 일 데이터를 저장하는 메인 테이블입니다.

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

-- 사용자별 조회 최적화 인덱스
CREATE INDEX idx_todos_user_id ON todos(user_id);

-- 정렬 최적화 인덱스 (user_id, priority, order)
CREATE INDEX idx_todos_user_priority_order ON todos(user_id, priority, "order");

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 테이블 생성 방법
1. Supabase Dashboard에서 **SQL Editor** 메뉴 클릭
2. "New query" 클릭
3. 위의 SQL 쿼리를 차례로 복사하여 실행 (먼저 `users`, 그다음 `todos`)
4. "Run" 버튼 클릭하여 실행

## 3. Row Level Security (RLS) 설정

Supabase는 기본적으로 RLS가 활성화되어 있습니다. 이 앱은 별도의 인증 시스템 없이 익명 사용자가 사용하므로, 모든 익명 접근을 허용하는 정책을 설정합니다.

### 3.1 익명 사용자 기반 RLS 정책

현재 앱은 인증 시스템이 없으므로, 모든 익명 사용자가 CRUD 작업을 할 수 있도록 설정합니다. 프론트엔드에서 `user_id`를 기준으로 데이터를 필터링하여 사용자별 데이터 분리를 구현합니다.

```sql
-- users 테이블: 익명 사용자 누구나 조회/생성 가능
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- todos 테이블: 익명 사용자 누구나 CRUD 가능
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access to todos"
  ON todos FOR ALL
  USING (true)
  WITH CHECK (true);
```

**보안 참고사항**:
- 이 정책은 프로토타입 및 로컬 개발 환경에 적합합니다
- 모든 익명 사용자가 데이터베이스에 접근할 수 있으므로, 악의적인 사용자가 다른 사용자의 데이터를 조회/수정/삭제할 수 있습니다
- 프로덕션 배포 시에는 반드시 인증 시스템(Supabase Auth 또는 외부 인증)을 추가하고 RLS 정책을 강화해야 합니다

### 3.2 세분화된 익명 정책 (선택사항)

각 작업(SELECT, INSERT, UPDATE, DELETE)별로 정책을 분리하고 싶다면:

```sql
-- users 테이블
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Anonymous users can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update users"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete users"
  ON users FOR DELETE
  USING (true);

-- todos 테이블
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can view all todos"
  ON todos FOR SELECT
  USING (true);

CREATE POLICY "Anonymous users can insert todos"
  ON todos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update todos"
  ON todos FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete todos"
  ON todos FOR DELETE
  USING (true);
```

### 3.3 향후 Supabase Auth 추가 시

인증 시스템을 추가하면 다음과 같이 RLS 정책을 강화할 수 있습니다:

```sql
-- 기존 익명 정책 삭제
DROP POLICY IF EXISTS "Allow anonymous access to todos" ON todos;

-- 인증된 사용자만 자신의 todos에 접근
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

## 4. 클라이언트 설정

### 4.1 Supabase 라이브러리 설치

`index.html`의 `<head>` 섹션에 Supabase 클라이언트 라이브러리를 추가:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 4.2 환경 변수 설정

보안을 위해 API 키를 별도 파일로 관리하거나, `app.js` 상단에 설정:

```javascript
// app.js 상단에 추가
const SUPABASE_URL = 'https://YOUR_PROJECT_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**중요**: 실제 프로젝트에서는 `.env` 파일이나 빌드 시 환경 변수로 관리하세요.

## 5. 데이터 마이그레이션 전략

### 5.1 기존 localStorage 데이터 읽기

```javascript
// 기존 데이터 추출
const existingTodos = JSON.parse(localStorage.getItem('todos') || '[]');
const existingEmail = localStorage.getItem('userEmail');
```

### 5.2 Supabase로 마이그레이션

```javascript
async function migrateToSupabase() {
  // 1. 사용자 이메일 생성/조회
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert({ email: existingEmail }, { onConflict: 'email' })
    .select()
    .single();
  
  if (userError) {
    console.error('사용자 생성 실패:', userError);
    return;
  }

  // 2. todos 마이그레이션
  const todosToInsert = existingTodos.map(todo => ({
    user_id: user.id,
    text: todo.text,
    completed: todo.completed,
    priority: todo.priority || 'medium',
    order: todo.order || 0
  }));

  const { error: todosError } = await supabase
    .from('todos')
    .insert(todosToInsert);

  if (todosError) {
    console.error('Todos 마이그레이션 실패:', todosError);
  } else {
    console.log('마이그레이션 완료!');
    // localStorage 백업 후 삭제 (선택사항)
    localStorage.setItem('todos_backup', localStorage.getItem('todos'));
    localStorage.setItem('userEmail_backup', localStorage.getItem('userEmail'));
  }
}
```

## 6. API 사용 예시

### 6.1 사용자 생성/조회

```javascript
async function getOrCreateUser(email) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ email }, { onConflict: 'email' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### 6.2 Todos CRUD

```javascript
// 조회
async function fetchTodos(userId) {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })
    .order('order', { ascending: true });
  
  if (error) throw error;
  return data;
}

// 생성
async function createTodo(userId, text, priority) {
  const maxOrderResult = await supabase
    .from('todos')
    .select('order')
    .eq('user_id', userId)
    .order('order', { ascending: false })
    .limit(1);
  
  const maxOrder = maxOrderResult.data?.[0]?.order || -1;
  
  const { data, error } = await supabase
    .from('todos')
    .insert({
      user_id: userId,
      text,
      priority,
      order: maxOrder + 1
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// 업데이트
async function updateTodo(id, updates) {
  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// 삭제
async function deleteTodoFromDB(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
```

## 7. 실시간 업데이트 (선택사항)

Supabase는 실시간 데이터 동기화를 지원합니다. 여러 디바이스에서 동시에 사용할 때 유용합니다.

```javascript
// todos 테이블의 변경사항 구독
const subscription = supabase
  .channel('todos-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE 모두 감지
      schema: 'public',
      table: 'todos',
      filter: `user_id=eq.${currentUserId}`
    },
    (payload) => {
      console.log('변경 감지:', payload);
      // UI 업데이트 로직
      renderTodos();
    }
  )
  .subscribe();

// 구독 해제
// subscription.unsubscribe();
```

## 8. 다음 단계

1. **Supabase 프로젝트 생성**: 위 1.1 단계 진행
2. **테이블 생성**: SQL Editor에서 2.1, 2.2 쿼리 실행
3. **RLS 설정**: 3.1의 정책 쿼리 실행
4. **클라이언트 코드 작성**: `app.js`를 수정하여 localStorage 대신 Supabase API 호출
5. **테스트**: 로컬에서 CRUD 기능 테스트
6. **마이그레이션**: 기존 사용자 데이터를 Supabase로 이전 (5.2 참고)

## 9. 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)

## 10. 문제 해결

### CORS 오류
- Supabase는 기본적으로 모든 origin을 허용합니다. CORS 오류가 발생하면 **Settings** → **API** → **CORS** 설정 확인

### RLS 정책 오류
- `new row violates row-level security policy` 오류 시:
  - SQL Editor에서 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 확인
  - 정책이 올바르게 생성되었는지 확인 (`\d+ tablename` 또는 Dashboard의 Authentication → Policies)

### 연결 오류
- API URL과 anon key가 올바른지 확인
- 브라우저 콘솔에서 네트워크 탭 확인
