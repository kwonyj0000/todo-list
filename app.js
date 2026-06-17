// Supabase 설정
const SUPABASE_URL = 'https://bmarqwvqkvegnqzbdwlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtYXJxd3Zxa3ZlZ25xemJkd2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Njg2MDYsImV4cCI6MjA5NzI0NDYwNn0.KgJlfJWk-XIqZX24Tvopvt_frNNVO5x2Cs1wHDVDJR8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PRIORITY_ORDER = {
    high: 1,
    medium: 2,
    low: 3
};

const PRIORITY_LABELS = {
    high: '높음',
    medium: '중간',
    low: '낮음'
};

let todos = [];
let currentUser = null;
let currentFilter = 'all';
let draggedElement = null;
let draggedTodoId = null;

// 인증 확인 함수
async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error('인증 확인 오류:', error);
        redirectToLogin();
        return null;
    }

    if (!session) {
        redirectToLogin();
        return null;
    }

    currentUser = session.user;
    return currentUser;
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// 로그아웃 함수
async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        redirectToLogin();
    } catch (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃에 실패했습니다.');
    }
}

async function loadTodos() {
    if (!currentUser) {
        todos = [];
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('todos')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('priority', { ascending: true })
            .order('order', { ascending: true });

        if (error) throw error;

        todos = data.map(todo => ({
            id: todo.id,
            text: todo.text,
            completed: todo.completed,
            priority: todo.priority,
            order: todo.order,
            createdAt: new Date(todo.created_at).getTime()
        }));
    } catch (error) {
        console.error('할 일 목록 로드 오류:', error);
        todos = [];
    }
}

function getIncompleteTodos() {
    return todos.filter(todo => !todo.completed);
}

function sortTodosByPriority(todosArray) {
    return [...todosArray].sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] || 2;
        const priorityB = PRIORITY_ORDER[b.priority] || 2;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return (a.order || 0) - (b.order || 0);
    });
}

function getFilteredTodos() {
    if (currentFilter === 'all') {
        return sortTodosByPriority(todos);
    }
    return sortTodosByPriority(todos.filter(todo => todo.priority === currentFilter));
}

function renderTodos() {
    const todoList = document.getElementById('todo-list');
    const emptyState = document.getElementById('empty-state');
    const filteredTodos = getFilteredTodos();

    if (filteredTodos.length === 0) {
        todoList.style.display = 'none';
        emptyState.style.display = 'block';
        if (currentFilter !== 'all' && todos.length > 0) {
            emptyState.textContent = '해당 우선순위의 할 일이 없습니다.';
        } else {
            emptyState.textContent = '할 일이 없습니다. 새로운 할 일을 추가해보세요!';
        }
    } else {
        todoList.style.display = 'block';
        emptyState.style.display = 'none';

        todoList.innerHTML = filteredTodos.map(todo => {
            const priority = todo.priority || 'medium';
            return `
            <li class="todo-item priority-${priority} ${todo.completed ? 'completed' : ''}"
                data-id="${todo.id}"
                data-priority="${priority}"
                draggable="true">
                <span class="drag-handle" aria-label="드래그 핸들">⋮⋮</span>
                <input
                    type="checkbox"
                    class="todo-checkbox"
                    ${todo.completed ? 'checked' : ''}
                    aria-label="할 일 완료 체크"
                >
                <span class="priority-badge ${priority}">${PRIORITY_LABELS[priority]}</span>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="btn btn-danger todo-delete" aria-label="할 일 삭제">삭제</button>
            </li>
        `;
        }).join('');

        attachDragHandlers();
    }

    updateNotificationButton();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateNotificationButton() {
    const notificationArea = document.getElementById('notification-area');
    const incompleteTodos = getIncompleteTodos();

    if (incompleteTodos.length > 0 && currentUser) {
        notificationArea.innerHTML = `
            <button id="notification-btn">
                미완료 ${incompleteTodos.length}개 알림 보내기
            </button>
        `;

        const notificationBtn = document.getElementById('notification-btn');
        notificationBtn.addEventListener('click', handleNotification);
    } else {
        notificationArea.innerHTML = '';
    }
}

function handleNotification() {
    const incompleteTodos = getIncompleteTodos();

    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }

    console.log('알림 발송 대상 이메일:', currentUser.email);
    console.log('미완료 항목:', incompleteTodos);

    alert(`알림 기능은 백엔드 연동 후 사용 가능합니다.\n\n발송 대상: ${currentUser.email}\n미완료 항목: ${incompleteTodos.length}개`);
}

async function addTodo(text, priority = 'medium') {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        redirectToLogin();
        return;
    }

    try {
        const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : -1;

        const { data, error } = await supabaseClient
            .from('todos')
            .insert({
                user_id: currentUser.id,
                text: text,
                completed: false,
                priority: priority,
                order: maxOrder + 1
            })
            .select()
            .single();

        if (error) throw error;

        todos.push({
            id: data.id,
            text: data.text,
            completed: data.completed,
            priority: data.priority,
            order: data.order,
            createdAt: new Date(data.created_at).getTime()
        });

        renderTodos();
    } catch (error) {
        console.error('할 일 추가 오류:', error);
        alert('할 일 추가에 실패했습니다.');
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
        const newCompleted = !todo.completed;

        const { error } = await supabaseClient
            .from('todos')
            .update({ completed: newCompleted })
            .eq('id', id);

        if (error) throw error;

        todo.completed = newCompleted;
        renderTodos();
    } catch (error) {
        console.error('할 일 토글 오류:', error);
        alert('할 일 상태 변경에 실패했습니다.');
    }
}

async function deleteTodo(id) {
    try {
        const { error } = await supabaseClient
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        todos = todos.filter(t => t.id !== id);
        renderTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일 삭제에 실패했습니다.');
    }
}

function attachDragHandlers() {
    const todoItems = document.querySelectorAll('.todo-item');

    todoItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    draggedTodoId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (e.currentTarget !== draggedElement) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drag-over');

    if (draggedElement === dropTarget) {
        return;
    }

    const draggedId = draggedTodoId;
    const targetId = dropTarget.dataset.id;

    const draggedTodo = todos.find(t => t.id === draggedId);
    const targetTodo = todos.find(t => t.id === targetId);

    if (!draggedTodo || !targetTodo) {
        return;
    }

    const targetPriority = targetTodo.priority;

    if (draggedTodo.priority !== targetPriority) {
        draggedTodo.priority = targetPriority;
    }

    const filteredTodos = getFilteredTodos();
    const draggedIndex = filteredTodos.findIndex(t => t.id === draggedId);
    const targetIndex = filteredTodos.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
        return;
    }

    const samePriorityTodos = filteredTodos.filter(t => t.priority === targetPriority);
    const draggedInGroup = samePriorityTodos.findIndex(t => t.id === draggedId);

    if (draggedInGroup !== -1) {
        samePriorityTodos.splice(draggedInGroup, 1);
    }

    const newTargetIndex = samePriorityTodos.findIndex(t => t.id === targetId);
    samePriorityTodos.splice(newTargetIndex + (draggedIndex < targetIndex ? 1 : 0), 0, draggedTodo);

    samePriorityTodos.forEach((todo, index) => {
        todo.order = index;
    });

    try {
        const updates = samePriorityTodos.map(todo => ({
            id: todo.id,
            user_id: currentUser.id,
            text: todo.text,
            completed: todo.completed,
            priority: todo.priority,
            order: todo.order
        }));

        const { error } = await supabaseClient
            .from('todos')
            .upsert(updates);

        if (error) throw error;

        renderTodos();
    } catch (error) {
        console.error('드래그 앤 드롭 저장 오류:', error);
        alert('순서 변경 저장에 실패했습니다.');
        await loadTodos();
        renderTodos();
    }

    return false;
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');

    const todoItems = document.querySelectorAll('.todo-item');
    todoItems.forEach(item => {
        item.classList.remove('drag-over');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'block';

    // 인증 확인
    const user = await checkAuth();
    if (!user) return;

    // 사용자 이메일 표시
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay) {
        userEmailDisplay.textContent = user.email;
    }

    // 할 일 목록 로드
    await loadTodos();
    renderTodos();

    if (loadingEl) loadingEl.style.display = 'none';

    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // 할 일 추가 폼
    const todoForm = document.getElementById('todo-form');
    todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const todoInput = document.getElementById('todo-input');
        const prioritySelect = document.getElementById('priority-select');
        const text = todoInput.value.trim();
        const priority = prioritySelect.value;

        if (!text) {
            alert('할 일을 입력해주세요.');
            return;
        }

        await addTodo(text, priority);
        todoInput.value = '';
        prioritySelect.value = 'medium';
        todoInput.focus();
    });

    // 할 일 클릭 이벤트
    const todoList = document.getElementById('todo-list');
    todoList.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (!todoItem) return;

        const todoId = todoItem.dataset.id;

        if (e.target.classList.contains('todo-checkbox')) {
            toggleTodo(todoId);
        } else if (e.target.classList.contains('todo-delete')) {
            deleteTodo(todoId);
        }
    });

    // 우선순위 필터
    const priorityFilter = document.getElementById('priority-filter');
    priorityFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderTodos();
    });
});
