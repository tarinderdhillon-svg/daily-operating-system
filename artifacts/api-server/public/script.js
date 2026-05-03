// API Configuration
const API_URL = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadDashboard();
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Load tab content
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'calendar':
            loadCalendar();
            break;
        case 'chat':
            loadChat();
            break;
        case 'learning':
            loadLearning();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    const statsContent = document.getElementById('stats-content');

    try {
        const tasks = await fetch(`${API_URL}/tasks`).then(r => r.json());
        const projects = await fetch(`${API_URL}/projects`).then(r => r.json());

        const activeTasks = tasks.categorized?.inProgress?.length || 0;
        const totalTasks = tasks.tasks?.length || 0;
        const completedTasks = tasks.completed?.length || 0;
        const totalProjects = projects.projects?.length || 0;

        statsContent.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 2em; font-weight: bold; color: #3b82f6;">${totalTasks}</div>
                    <div style="color: #6b7280; margin-top: 5px;">Total Tasks</div>
                </div>
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="font-size: 2em; font-weight: bold; color: #10b981;">${completedTasks}</div>
                    <div style="color: #6b7280; margin-top: 5px;">Completed</div>
                </div>
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 2em; font-weight: bold; color: #f59e0b;">${activeTasks}</div>
                    <div style="color: #6b7280; margin-top: 5px;">In Progress</div>
                </div>
                <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #a855f7;">
                    <div style="font-size: 2em; font-weight: bold; color: #a855f7;">${totalProjects}</div>
                    <div style="color: #6b7280; margin-top: 5px;">Projects</div>
                </div>
            </div>
        `;
    } catch (error) {
        statsContent.innerHTML = '<div class="error">Error loading stats: ' + error.message + '</div>';
    }
}

// Tasks
async function loadTasks() {
    const tasksList = document.getElementById('tasks-list');

    try {
        const response = await fetch(`${API_URL}/tasks`);
        const data = await response.json();
        const tasks = data.categorized || {};

        let html = '';

        if (tasks.overdue && tasks.overdue.length > 0) {
            html += '<h3 style="color: #ef4444; margin-top: 20px; margin-bottom: 10px;">⚠️ Overdue</h3>';
            tasks.overdue.forEach(task => {
                html += renderTask(task, 'overdue');
            });
        }

        if (tasks.inProgress && tasks.inProgress.length > 0) {
            html += '<h3 style="color: #f59e0b; margin-top: 20px; margin-bottom: 10px;">🔄 In Progress</h3>';
            tasks.inProgress.forEach(task => {
                html += renderTask(task);
            });
        }

        if (tasks.outstanding && tasks.outstanding.length > 0) {
            html += '<h3 style="color: #3b82f6; margin-top: 20px; margin-bottom: 10px;">📋 This Week</h3>';
            tasks.outstanding.forEach(task => {
                html += renderTask(task);
            });
        }

        if (tasks.todo && tasks.todo.length > 0) {
            html += '<h3 style="color: #6b7280; margin-top: 20px; margin-bottom: 10px;">📝 Todo</h3>';
            tasks.todo.forEach(task => {
                html += renderTask(task);
            });
        }

        if (html === '') {
            html = '<div class="loading">No tasks yet. Add one to get started! ✨</div>';
        }

        tasksList.innerHTML = html;
    } catch (error) {
        tasksList.innerHTML = '<div class="error">Error loading tasks: ' + error.message + '</div>';
    }
}

function renderTask(task, priority = '') {
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date';
    const color = priority === 'overdue' ? '#ef4444' :
                  task.priority === 'Urgent' ? '#ef4444' :
                  task.priority === 'High' ? '#f59e0b' : '#3b82f6';

    return `
        <div class="task-item" style="border-left-color: ${color};">
            <div>
                <strong>${task.title}</strong>
                <div style="color: #6b7280; font-size: 0.9em; margin-top: 5px;">
                    Due: ${dueDate} | Priority: ${task.priority || 'Normal'}
                </div>
                ${task.notes ? `<div style="color: #6b7280; font-size: 0.85em; margin-top: 5px; font-style: italic;">${task.notes}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-secondary" style="padding: 5px 10px;">✓ Done</button>
            </div>
        </div>
    `;
}

async function addTask() {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();

    if (!title) {
        alert('Please enter a task name');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status: 'Not started' })
        });

        if (response.ok) {
            input.value = '';
            loadTasks();
        } else {
            alert('Error adding task');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Projects
async function loadProjects() {
    const projectsList = document.getElementById('projects-list');

    try {
        const response = await fetch(`${API_URL}/projects`);
        const data = await response.json();

        if (!data.projects || data.projects.length === 0) {
            projectsList.innerHTML = '<div class="loading">No projects yet</div>';
            return;
        }

        let html = '';
        data.projects.forEach(project => {
            html += `
                <div class="project-item">
                    <h3>🎯 ${project.name}</h3>
                    <p style="color: #6b7280; margin-top: 5px;">Click to view details</p>
                </div>
            `;
        });

        projectsList.innerHTML = html;
    } catch (error) {
        projectsList.innerHTML = '<div class="error">Error loading projects: ' + error.message + '</div>';
    }
}

// Calendar
async function loadCalendar() {
    const calendarContent = document.getElementById('calendar-content');

    try {
        const response = await fetch(`${API_URL}/calendar`);
        const data = await response.json();

        if (!data.events || data.events.length === 0) {
            calendarContent.innerHTML = '<div class="loading">No calendar events scheduled</div>';
            return;
        }

        let html = '';
        data.events.forEach(event => {
            const start = new Date(event.start).toLocaleString();
            html += `
                <div class="calendar-event">
                    <h3>📅 ${event.title}</h3>
                    <p style="color: #6b7280; margin-top: 5px;">
                        ${start}
                        ${event.location ? ` • 📍 ${event.location}` : ''}
                    </p>
                </div>
            `;
        });

        calendarContent.innerHTML = html;
    } catch (error) {
        calendarContent.innerHTML = '<div class="loading">Calendar not connected. Check your settings.</div>';
    }
}

// Chat
async function loadChat() {
    document.getElementById('chat-messages').innerHTML = '<div class="message assistant">👋 Hi! I\'m your AI assistant. What can I help you with today?</div>';
    document.getElementById('chatInput').value = '';
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    const messagesDiv = document.getElementById('chat-messages');

    if (!message) return;

    // Add user message
    messagesDiv.innerHTML += `<div class="message user">${message}</div>`;
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            const data = await response.json();
            messagesDiv.innerHTML += `<div class="message assistant">${data.response || 'Got it! I\'m thinking...'}</div>`;
        } else {
            messagesDiv.innerHTML += `<div class="message assistant">Sorry, I encountered an error. Please try again.</div>`;
        }
    } catch (error) {
        messagesDiv.innerHTML += `<div class="message assistant">Error: ${error.message}</div>`;
    }

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Learning
async function loadLearning() {
    const learningContent = document.getElementById('learning-content');

    try {
        const response = await fetch(`${API_URL}/learning`);
        const data = await response.json();

        if (!data.concept) {
            learningContent.innerHTML = '<div class="loading">No lesson available today. Check back tomorrow!</div>';
            return;
        }

        learningContent.innerHTML = `
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #10b981; margin-bottom: 10px;">📚 Today's Lesson: ${data.concept}</h3>
                <div style="color: #6b7280; line-height: 1.8;">
                    ${data.lesson || 'Loading your personalized lesson...'}
                </div>
            </div>
        `;
    } catch (error) {
        learningContent.innerHTML = '<div class="loading">Learning module not available</div>';
    }
}
