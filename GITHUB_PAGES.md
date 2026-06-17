# GitHub Pages 배포 가이드

이 문서는 Todo List 앱을 GitHub Pages로 배포하는 방법을 설명합니다.

## 사전 준비

- GitHub 계정
- Git 설치
- 배포할 파일: `index.html`, `app.js`, `style.css`

## 1. GitHub 리포지토리 생성

### 1.1 GitHub에서 새 리포지토리 생성

1. [GitHub](https://github.com) 로그인
2. 우측 상단 `+` 버튼 → `New repository` 클릭
3. 리포지토리 정보 입력:
   - **Repository name**: `todo-list`
   - **Description**: `Simple todo list app with Supabase`
   - **Public** 선택 (GitHub Pages는 Public 리포지토리에서 무료)
   - **Add a README file**: 체크 해제
   - **Add .gitignore**: None
   - **Choose a license**: 선택 (예: MIT)
4. `Create repository` 클릭

### 1.2 리포지토리 URL 확인

생성 후 표시되는 리포지토리 URL:
```
https://github.com/kwonyj0000/todo-list
```

GitHub Pages로 배포되면 다음 URL로 접근 가능:
```
https://kwonyj0000.github.io/todo-list/
```

## 2. 로컬 Git 리포지토리 설정

### 2.1 배포용 디렉토리 생성 및 파일 복사

현재 디렉토리에서 필요한 파일만 복사합니다:

```bash
# 현재 위치 확인
pwd
# /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/kwonyj0000/day02/todo

# 임시 배포 디렉토리 생성
mkdir -p ~/todo-list-deploy
cd ~/todo-list-deploy

# 필요한 파일만 복사
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/kwonyj0000/day02/todo/index.html .
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/kwonyj0000/day02/todo/app.js .
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/kwonyj0000/day02/todo/style.css .
```

### 2.2 Git 초기화 및 원격 리포지토리 연결

```bash
# Git 초기화
git init

# 원격 리포지토리 추가 (kwonyj0000을 실제 GitHub 계정명으로 변경)
git remote add origin https://github.com/kwonyj0000/todo-list.git

# 현재 브랜치를 main으로 변경 (GitHub 기본 브랜치)
git branch -M main
```

### 2.3 README 파일 생성

```bash
cat > README.md << 'EOF'
# Todo List

우선순위 관리와 드래그앤드롭 기능이 있는 간단한 할 일 관리 앱입니다.

## 기능

- 이메일 기반 사용자 관리
- 할 일 추가/삭제/완료
- 우선순위 설정 (높음/중간/낮음)
- 드래그앤드롭으로 순서 변경
- 우선순위별 필터링
- Supabase 백엔드 연동

## 기술 스택

- Vanilla JavaScript
- HTML5 / CSS3
- Supabase (PostgreSQL)

## 데모

https://kwonyj0000.github.io/todo-list/

## 로컬 실행

```bash
# 간단히 브라우저에서 열기
open index.html

# 또는 로컬 서버 실행
python3 -m http.server 8000
```

## 라이선스

MIT
EOF
```

**중요**: `kwonyj0000`을 실제 GitHub 계정명으로 변경하세요.

### 2.4 .gitignore 파일 생성

```bash
cat > .gitignore << 'EOF'
# macOS
.DS_Store

# 테스트 파일
test-*.html

# 문서 (배포 시 불필요)
CLAUDE.md
SUPABASE.md
MIGRATION_COMPLETE.md
GITHUB_PAGES.md

# 로컬 설정
.vscode/
*.swp
*.swo
EOF
```

### 2.5 커밋 및 푸시

```bash
# 파일 추가
git add index.html app.js style.css README.md .gitignore

# 커밋
git commit -m "Initial commit: Todo app with Supabase integration"

# 푸시 (첫 번째 푸시)
git push -u origin main
```

GitHub 로그인이 필요하면 인증 정보를 입력합니다.

## 3. GitHub Pages 설정

### 3.1 웹 인터페이스에서 설정

1. GitHub 리포지토리 페이지로 이동
   ```
   https://github.com/kwonyj0000/todo-list
   ```

2. **Settings** 탭 클릭

3. 왼쪽 사이드바에서 **Pages** 클릭

4. **Source** 섹션에서:
   - **Branch**: `main` 선택
   - **Folder**: `/ (root)` 선택
   - **Save** 클릭

5. 몇 분 후 페이지 상단에 배포 URL이 표시됩니다:
   ```
   Your site is live at https://kwonyj0000.github.io/todo-list/
   ```

### 3.2 GitHub Actions로 자동 배포 (선택사항)

GitHub Pages는 기본적으로 푸시할 때마다 자동으로 재배포됩니다. 추가 설정이 필요 없습니다.

## 4. Supabase CORS 설정 확인

GitHub Pages로 배포하면 도메인이 변경되므로 Supabase에서 CORS 설정을 확인해야 합니다.

### 4.1 Supabase Dashboard에서 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택: `bmarqwvqkvegnqzbdwlo`
3. **Settings** → **API** 메뉴
4. **CORS Allowed Origins** 섹션 확인

기본적으로 Supabase는 모든 origin(`*`)을 허용하므로, 추가 설정이 필요 없을 가능성이 높습니다.

만약 CORS 오류가 발생하면:
- **Settings** → **API** → **CORS Configuration**
- 다음 URL을 허용 목록에 추가:
  ```
  https://kwonyj0000.github.io
  ```

## 5. 배포 확인

### 5.1 배포된 사이트 접속

브라우저에서 다음 URL 접속:
```
https://kwonyj0000.github.io/todo-list/
```

### 5.2 기능 테스트

1. 이메일 입력 및 저장
2. 할 일 추가
3. 완료 체크
4. 드래그앤드롭으로 순서 변경
5. 우선순위 필터링
6. 페이지 새로고침 후 데이터 유지 확인

### 5.3 브라우저 개발자 도구 확인

- F12 → Console 탭에서 에러가 없는지 확인
- Network 탭에서 Supabase API 호출이 성공하는지 확인 (Status 200 또는 201)

## 6. 업데이트 배포

코드를 수정한 후 다시 배포하려면:

```bash
# 배포 디렉토리로 이동
cd ~/todo-list-deploy

# 원본에서 파일 복사
cp /home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/kwonyj0000/day02/todo/app.js .
# 다른 파일도 필요시 복사

# Git 커밋
git add .
git commit -m "Update: 변경사항 설명"

# 푸시
git push origin main
```

GitHub Pages는 푸시 후 약 1-5분 내에 자동으로 재배포됩니다.

## 7. 커스텀 도메인 설정 (선택사항)

자신의 도메인을 사용하고 싶다면:

### 7.1 GitHub Pages 설정

1. **Settings** → **Pages**
2. **Custom domain** 섹션에 도메인 입력 (예: `todo.example.com`)
3. **Save** 클릭

### 7.2 DNS 설정

도메인 제공업체(예: GoDaddy, Namecheap)에서:

**A 레코드 추가** (Apex 도메인 사용 시):
```
Type: A
Host: @
Value: 185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153
```

**CNAME 레코드 추가** (서브도메인 사용 시):
```
Type: CNAME
Host: todo
Value: kwonyj0000.github.io
```

### 7.3 HTTPS 설정

1. DNS 전파 대기 (최대 24시간)
2. GitHub Pages 설정에서 **Enforce HTTPS** 체크

## 8. 문제 해결

### 8.1 404 Not Found

- **원인**: 파일 경로 문제 또는 배포 대기 중
- **해결**:
  - 브랜치가 `main`이고 폴더가 `/`(root)인지 확인
  - 5분 정도 기다린 후 다시 시도
  - `index.html` 파일이 루트에 있는지 확인

### 8.2 Supabase 연결 오류

- **원인**: CORS 정책 또는 API 키 문제
- **해결**:
  - 브라우저 콘솔에서 정확한 에러 메시지 확인
  - Supabase Dashboard → Settings → API에서 URL과 Key 재확인
  - CORS 설정 확인

### 8.3 데이터가 저장되지 않음

- **원인**: RLS 정책 또는 테이블 권한 문제
- **해결**:
  - Supabase Dashboard → SQL Editor에서 RLS 정책 확인:
    ```sql
    SELECT * FROM pg_policies WHERE tablename IN ('users', 'todos');
    ```
  - SUPABASE.md의 3.1 섹션 참고하여 정책 재설정

### 8.4 Changes not updating

- **원인**: 브라우저 캐시
- **해결**:
  - 하드 리프레시: `Ctrl+Shift+R` (Windows/Linux) 또는 `Cmd+Shift+R` (macOS)
  - 시크릿 모드로 접속하여 확인

## 9. 보안 고려사항

### 9.1 Supabase API Key 노출

현재 코드에서 `SUPABASE_ANON_KEY`가 클라이언트 코드에 포함되어 있습니다. 이것은 **anon(public) key**이므로 공개되어도 안전합니다. Supabase의 RLS(Row Level Security) 정책이 실제 보안을 담당합니다.

**주의**:
- ❌ `service_role` 키는 절대 클라이언트에 포함하지 마세요
- ✅ `anon` 키는 클라이언트에 사용해도 안전합니다

### 9.2 RLS 정책 강화

현재는 익명 사용자가 모든 데이터에 접근할 수 있습니다. 프로덕션 배포 시에는 Supabase Auth를 추가하고 RLS 정책을 강화하세요.

## 10. 참고 링크

- [GitHub Pages 공식 문서](https://docs.github.com/en/pages)
- [Supabase 문서](https://supabase.com/docs)
- [커스텀 도메인 설정](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## 11. 배포 체크리스트

배포 전 확인사항:

- [ ] Supabase 테이블 생성 완료 (users, todos)
- [ ] RLS 정책 설정 완료
- [ ] 로컬에서 정상 동작 확인
- [ ] GitHub 리포지토리 생성
- [ ] 파일 푸시 완료
- [ ] GitHub Pages 설정 완료
- [ ] 배포 URL 접속 확인
- [ ] Supabase 연동 테스트 (CRUD 동작 확인)
- [ ] 브라우저 콘솔 에러 없음 확인
- [ ] 여러 브라우저에서 테스트 (Chrome, Firefox, Safari)

---

**배포 완료 후 URL을 README.md에 업데이트하는 것을 잊지 마세요!**
