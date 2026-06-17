// Supabase 클라이언트 초기화
const SUPABASE_URL = 'https://bmarqwvqkvegnqzbdwlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtYXJxd3Zxa3ZlZ25xemJkd2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Njg2MDYsImV4cCI6MjA5NzI0NDYwNn0.KgJlfJWk-XIqZX24Tvopvt_frNNVO5x2Cs1wHDVDJR8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 이메일 유효성 검사
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 메시지 표시 함수
function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message message-${type}`;
}

// 회원가입 처리
async function handleSignup(email) {
    if (!isValidEmail(email)) {
        showMessage('올바른 이메일 형식을 입력해주세요.', 'error');
        return;
    }

    try {
        // 임시 비밀번호 자동 생성 (32자, 사용자는 Magic Link로 로그인하므로 비밀번호 불필요)
        const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: tempPassword,
            options: {
                emailRedirectTo: `${window.location.origin}/index.html`
            }
        });

        if (error) throw error;

        showMessage('가입 확인 이메일이 전송되었습니다. 이메일을 확인해주세요.', 'success');
    } catch (error) {
        console.error('회원가입 오류:', error);
        showMessage(`회원가입 실패: ${error.message}`, 'error');
    }
}

// 로그인 (Magic Link) 처리
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

        showMessage('로그인 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.', 'success');
    } catch (error) {
        console.error('로그인 오류:', error);
        showMessage(`로그인 실패: ${error.message}`, 'error');
    }
}

// 소셜 로그인 (Google / GitHub) 처리
async function handleSocialLogin(provider) {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/index.html`
            }
        });

        if (error) throw error;
        // 성공 시 Supabase가 공급자 인증 페이지로 자동 리다이렉트합니다.
    } catch (error) {
        console.error('소셜 로그인 오류:', error);
        showMessage(`소셜 로그인 실패: ${error.message}`, 'error');
    }
}

// 페이지 로드 시 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    // 소셜 로그인 버튼 이벤트 등록
    document.querySelectorAll('[data-oauth-provider]').forEach((btn) => {
        btn.addEventListener('click', () => {
            handleSocialLogin(btn.dataset.oauthProvider);
        });
    });

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
