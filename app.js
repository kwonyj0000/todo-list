// Supabase 설정
const SUPABASE_URL = 'https://bmarqwvqkvegnqzbdwlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtYXJxd3Zxa3ZlZ25xemJkd2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Njg2MDYsImV4cCI6MjA5NzI0NDYwNn0.KgJlfJWk-XIqZX24Tvopvt_frNNVO5x2Cs1wHDVDJR8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
    USER_EMAIL: 'userEmail',
    TODOS: 'todos',
    USER_ID: 'userId'
};

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
let userEmail = '';
let userId = null;
let currentFilter = 'all';
let draggedElement = null;
let draggedTodoId = null;

async function saveUserEmail(email) {
    try {
        // Supabase에서 사용자 생성 또는 조회 (upsert)
        const { data, error } = await supabaseClient
            .from('users')
            .upsert({ email }, { onConflict: 'email' })
            .select()
            .single();

        if (error) throw error;

        userId = data.id;
        userEmail = email;

        // localStorage에도 백업
        localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
        localStorage.setItem(STORAGE_KEYS.USER_ID, userId);

        return data;
    } catch (error) {
        console.error('사용자 저장 오류:', error);
        alert('사용자 정보 저장에 실패했습니다.');
        throw error;
    }
}

async function loadUserEmail() {
    // localStorage에서 먼저 확인
    const cachedEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    const cachedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);

    if (cachedEmail && cachedUserId) {
        userEmail = cachedEmail;
        userId = cachedUserId;
        return cachedEmail;
    }

    return null;
}

async function saveTodos() {
    // Supabase 동기화는 각 CRUD 함수에서 개별적으로 처리
    // 이 함수는 호환성을 위해 유지
}

async function loadTodos() {
    if (!userId) {
        todos = [];
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('priority', { ascending: true })
            .order('order', { ascending: true });

        if (error) throw error;

        // Supabase의 UUID를 문자열로 변환하여 기존 로직과 호환
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

    if (incompleteTodos.length > 0 && userEmail) {
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

    if (!userEmail) {
        alert('이메일을 먼저 등록해주세요.');
        return;
    }

    console.log('알림 발송 대상 이메일:', userEmail);
    console.log('미완료 항목:', incompleteTodos);

    alert(`알림 기능은 백엔드 연동 후 사용 가능합니다.\n\n발송 대상: ${userEmail}\n미완료 항목: ${incompleteTodos.length}개`);
}

async function addTodo(text, priority = 'medium') {
    if (!userId) {
        alert('먼저 이메일을 등록해주세요.');
        return;
    }

    try {
        const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : -1;

        const { data, error } = await supabaseClient
            .from('todos')
            .insert({
                user_id: userId,
                text: text,
                completed: false,
                priority: priority,
                order: maxOrder + 1
            })
            .select()
            .single();

        if (error) throw error;

        // 로컬 todos 배열에 추가
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

        // 로컬 상태 업데이트
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

        // 로컬 배열에서 제거
        todos = todos.filter(t => t.id !== id);
        renderTodos();
    } catch (error) {
        console.error('할 일 삭제 오류:', error);
        alert('할 일 삭제에 실패했습니다.');
    }
}

function updateUserEmailDisplay() {
    const userForm = document.getElementById('user-form');
    const userEmailDisplay = document.getElementById('user-email-display');
    const displayedEmail = document.getElementById('displayed-email');
    const userEmailInput = document.getElementById('user-email');

    if (userEmail) {
        userForm.style.display = 'none';
        userEmailDisplay.style.display = 'flex';
        displayedEmail.textContent = userEmail;
        updateNotificationButton();
    } else {
        userForm.style.display = 'block';
        userEmailDisplay.style.display = 'none';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
    const priorityChanged = draggedTodo.priority !== targetPriority;

    if (priorityChanged) {
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

    // Supabase에 변경사항 저장
    try {
        const updates = samePriorityTodos.map(todo => ({
            id: todo.id,
            user_id: userId,
            text: todo.text,
            completed: todo.completed,
            priority: todo.priority,
            order: todo.order
        }));

        // upsert로 일괄 업데이트
        const { error } = await supabaseClient
            .from('todos')
            .upsert(updates);

        if (error) throw error;

        renderTodos();
    } catch (error) {
        console.error('드래그 앤 드롭 저장 오류:', error);
        alert('순서 변경 저장에 실패했습니다.');
        // 실패 시 데이터 다시 로드
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
    await loadUserEmail();

    if (userId) {
        await loadTodos();
    }

    updateUserEmailDisplay();
    renderTodos();

    const userForm = document.getElementById('user-form');
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('user-email');
        const email = emailInput.value.trim();

        if (!email) {
            alert('이메일을 입력해주세요.');
            return;
        }

        if (!isValidEmail(email)) {
            alert('올바른 이메일 형식을 입력해주세요.');
            return;
        }

        await saveUserEmail(email);
        await loadTodos();
        updateUserEmailDisplay();
        renderTodos();
        emailInput.value = '';
    });

    const editEmailBtn = document.getElementById('edit-email-btn');
    editEmailBtn.addEventListener('click', () => {
        const userForm = document.getElementById('user-form');
        const userEmailDisplay = document.getElementById('user-email-display');
        const userEmailInput = document.getElementById('user-email');

        userForm.style.display = 'block';
        userEmailDisplay.style.display = 'none';
        userEmailInput.value = userEmail;
        userEmailInput.focus();
    });

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

    const priorityFilter = document.getElementById('priority-filter');
    priorityFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderTodos();
    });

    if (getIncompleteTodos().length > 0 && userEmail) {
        console.log('페이지 로드 시 미완료 항목이 있습니다. 알림 버튼이 표시됩니다.');
    }
});
