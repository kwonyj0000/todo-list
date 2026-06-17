# Supabase 마이그레이션 완료

localStorage에서 Supabase로의 마이그레이션이 완료되었습니다.

## 변경된 파일

### 1. index.html
- Supabase JavaScript 클라이언트 라이브러리 추가
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 2. app.js

#### 추가된 설정
```javascript
const SUPABASE_URL = 'https://bmarqwvqkvegnqzbdwlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

#### 수정된 함수들
모든 데이터 CRUD 함수가 async/await 기반으로 변경되었습니다:

1. **saveUserEmail()** - async
   - Supabase `users` 테이블에 upsert
   - `userId` 저장 및 localStorage 백업

2. **loadUserEmail()** - async
   - localStorage에서 캐시된 사용자 정보 로드

3. **loadTodos()** - async
   - Supabase `todos` 테이블에서 사용자별 할 일 로드
   - priority와 order로 정렬

4. **addTodo()** - async
   - Supabase에 INSERT 후 로컬 배열 업데이트

5. **toggleTodo()** - async
   - Supabase에 UPDATE 후 로컬 상태 업데이트

6. **deleteTodo()** - async
   - Supabase에서 DELETE 후 로컬 배열 업데이트

7. **handleDrop()** - async
   - 드래그앤드롭으로 변경된 순서를 Supabase에 일괄 upsert

8. **이벤트 핸들러들**
   - `DOMContentLoaded`, `user-form submit`, `todo-form submit` 모두 async로 변경

## 데이터 흐름

### 이전 (localStorage)
```
User Action → Update todos array → localStorage.setItem() → Render
```

### 현재 (Supabase)
```
User Action → Supabase API call → Update todos array → Render
```

## 주요 특징

1. **사용자 관리**
   - 이메일 기반 사용자 식별
   - `userId`를 localStorage에 캐시하여 페이지 리로드 시 재사용

2. **에러 핸들링**
   - 모든 Supabase 호출에 try-catch 적용
   - 실패 시 사용자에게 알림 표시

3. **로컬 캐싱**
   - `todos` 배열은 메모리에 유지
   - Supabase는 영구 저장소로만 사용

4. **드래그앤드롭 최적화**
   - 같은 우선순위 그룹의 모든 todos를 일괄 업데이트 (upsert)

## 테스트 방법

1. **브라우저에서 열기**
   ```bash
   open index.html
   # 또는
   python3 -m http.server 8000
   ```

2. **테스트 시나리오**
   - [ ] 이메일 입력 및 저장
   - [ ] 할 일 추가 (high/medium/low 우선순위)
   - [ ] 할 일 완료 체크박스 토글
   - [ ] 할 일 삭제
   - [ ] 드래그앤드롭으로 순서 변경
   - [ ] 우선순위 필터링
   - [ ] 페이지 새로고침 후 데이터 유지 확인

3. **Supabase 확인**
   - Supabase Dashboard → Table Editor에서 `users`, `todos` 테이블 확인
   - SQL Editor에서 쿼리 실행:
     ```sql
     SELECT * FROM users;
     SELECT * FROM todos ORDER BY priority, "order";
     ```

## 알려진 제한사항

1. **오프라인 지원 없음**
   - 네트워크 연결이 필요
   - 향후 개선: localStorage를 임시 큐로 사용

2. **동시성 제어 없음**
   - 여러 탭에서 동시 수정 시 마지막 쓰기가 승리
   - 향후 개선: Supabase Realtime 구독

3. **인증 없음**
   - 익명 사용자 기반 (RLS 정책에서 모든 접근 허용)
   - 프로덕션 배포 시 Supabase Auth 추가 필요

## 다음 단계 (선택사항)

1. **Realtime 구독**
   - 여러 디바이스 간 실시간 동기화
   - SUPABASE.md의 7장 참고

2. **인증 추가**
   - Supabase Auth 통합
   - RLS 정책 강화

3. **오프라인 지원**
   - Service Worker + IndexedDB
   - 백그라운드 동기화

4. **알림 기능 구현**
   - 이메일 발송 API (Supabase Edge Functions)

## 롤백 방법

만약 문제가 발생하면:

1. **localStorage 백업 확인**
   - 브라우저 DevTools → Application → Local Storage
   - `todos_backup`, `userEmail_backup` 확인

2. **Git으로 되돌리기**
   ```bash
   git checkout HEAD~1 -- app.js index.html
   ```

## 참고

- 프로젝트 URL: https://bmarqwvqkvegnqzbdwlo.supabase.co
- Supabase Dashboard: https://supabase.com/dashboard/project/bmarqwvqkvegnqzbdwlo
- 자세한 설정 가이드: SUPABASE.md
