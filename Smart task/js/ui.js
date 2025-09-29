class UIManager {
    constructor() {
        this.currentView = 'grid';
        this.selectedTaskId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.ensureAddButtonVisible();
    }

    ensureAddButtonVisible() {
        const addButton = document.getElementById('addTaskBtn');
        if (addButton) {
            addButton.style.display = 'flex';
            addButton.style.visibility = 'visible';
            addButton.style.opacity = '1';
        }
    }

    bindEvents() {
        const addTaskBtn = document.getElementById('addTaskBtn');
        const closeModal = document.getElementById('closeModal');
        const cancelTask = document.getElementById('cancelTask');
        const taskForm = document.getElementById('taskForm');
        const confirmCancel = document.getElementById('confirmCancel');
        const confirmOk = document.getElementById('confirmOk');
        const createFirstTask = document.getElementById('createFirstTask');
        const searchInput = document.getElementById('searchInput');
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        const themeToggle = document.getElementById('themeToggle');
        const aiSuggestionBtn = document.getElementById('getAISuggestions');
        const predictDueDateBtn = document.getElementById('predictDueDate');

        if (addTaskBtn) addTaskBtn.addEventListener('click', () => this.openTaskModal());
        if (closeModal) closeModal.addEventListener('click', () => this.closeTaskModal());
        if (cancelTask) cancelTask.addEventListener('click', () => this.closeTaskModal());
        if (taskForm) taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        if (confirmCancel) confirmCancel.addEventListener('click', () => this.closeConfirmModal());
        if (confirmOk) confirmOk.addEventListener('click', () => this.confirmDelete());
        if (createFirstTask) createFirstTask.addEventListener('click', () => this.openTaskModal());

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        if (searchInput) {
            searchInput.addEventListener('input',
                this.debounce((e) => this.handleSearch(e), 300)
            );
        }

        if (gridViewBtn) gridViewBtn.addEventListener('click', () => this.setView('grid'));
        if (listViewBtn) listViewBtn.addEventListener('click', () => this.setView('list'));
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());
        if (aiSuggestionBtn) aiSuggestionBtn.addEventListener('click', () => this.getAISuggestions());
        if (predictDueDateBtn) predictDueDateBtn.addEventListener('click', () => this.predictDueDate());

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    async renderTasks() {
        const tasksGrid = document.getElementById('tasksGrid');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');

        if (loadingState) {
            loadingState.classList.remove('hidden');
            if (tasksGrid) tasksGrid.classList.add('hidden');
            if (emptyState) emptyState.classList.add('hidden');
        }

        try {
            const tasks = await taskManager.getTasks(taskManager.currentFilter, taskManager.searchQuery);

            if (loadingState) loadingState.classList.add('hidden');

            if (!tasks || tasks.length === 0) {
                if (tasksGrid) tasksGrid.classList.add('hidden');
                if (emptyState) emptyState.classList.remove('hidden');
            } else {
                if (tasksGrid) {
                    tasksGrid.classList.remove('hidden');
                    tasksGrid.className = this.currentView === 'grid' ? 'tasks-grid' : 'tasks-list';
                    tasksGrid.innerHTML = '';

                    tasks.forEach(task => {
                        const taskElement = this.createTaskElement(task);
                        tasksGrid.appendChild(taskElement);
                    });
                }
                if (emptyState) emptyState.classList.add('hidden');
            }
        } catch (error) {
            if (loadingState) loadingState.classList.add('hidden');
            if (tasksGrid) tasksGrid.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
        }

        this.ensureAddButtonVisible();
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-card ${task.priority}-priority ${task.completed ? 'completed' : ''}`;

        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;

        taskElement.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                <div class="task-actions">
                    <button class="task-action-btn edit-btn" data-id="${task.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn delete-btn" data-id="${task.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="task-description">${this.escapeHtml(task.description) || 'No description'}</p>
            <div class="task-meta">
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="fas fa-calendar"></i> ${dueDate}
                    ${isOverdue ? ' (Overdue)' : ''}
                </span>
            </div>
            <div class="task-footer">
                <div class="task-complete" data-id="${task.id}">
                    <div class="complete-checkbox ${task.completed ? 'checked' : ''}"></div>
                    <span>${task.completed ? 'Completed' : 'Mark complete'}</span>
                </div>
                <span class="task-date">Created: ${new Date(task.created_at).toLocaleDateString()}</span>
            </div>
        `;

        const editBtn = taskElement.querySelector('.edit-btn');
        const deleteBtn = taskElement.querySelector('.delete-btn');
        const completeBtn = taskElement.querySelector('.task-complete');

        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTaskModal(task.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openConfirmModal(task.id);
            });
        }

        if (completeBtn) {
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskComplete(task.id);
            });
        }

        return taskElement;
    }

    async updateStats() {
        try {
            const stats = await taskManager.getStats();

            const totalTasks = document.getElementById('totalTasks');
            const pendingTasks = document.getElementById('pendingTasks');
            const completedTasks = document.getElementById('completedTasks');
            const overdueTasks = document.getElementById('overdueTasks');

            if (totalTasks) totalTasks.textContent = stats.total || 0;
            if (pendingTasks) pendingTasks.textContent = stats.pending || 0;
            if (completedTasks) completedTasks.textContent = stats.completed || 0;
            if (overdueTasks) overdueTasks.textContent = stats.overdue || 0;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    openTaskModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('taskForm');

        if (!modal || !title || !form) return;

        this.selectedTaskId = taskId;

        if (taskId) {
            title.textContent = 'Edit Task';
            const task = taskManager.getTaskById(taskId);
            if (task) this.populateForm(task);
        } else {
            title.textContent = 'Create New Task';
            form.reset();
            const taskIdInput = document.getElementById('taskId');
            if (taskIdInput) taskIdInput.value = '';
        }

        modal.classList.remove('hidden');
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) modal.classList.add('hidden');
        this.selectedTaskId = null;
    }

    populateForm(task) {
        const titleInput = document.getElementById('taskTitle');
        const descInput = document.getElementById('taskDescription');
        const dueDateInput = document.getElementById('taskDueDate');
        const prioritySelect = document.getElementById('taskPriority');
        const taskIdInput = document.getElementById('taskId');

        if (titleInput) titleInput.value = task.title || '';
        if (descInput) descInput.value = task.description || '';
        if (dueDateInput) dueDateInput.value = task.due_date || '';
        if (prioritySelect) prioritySelect.value = task.priority || 'medium';
        if (taskIdInput) taskIdInput.value = task.id || '';
    }

    async handleTaskSubmit(e) {
        e.preventDefault();

        const titleInput = document.getElementById('taskTitle');
        const descInput = document.getElementById('taskDescription');
        const dueDateInput = document.getElementById('taskDueDate');
        const prioritySelect = document.getElementById('taskPriority');
        const recurrenceSelect = document.getElementById('taskRecurrence');

        if (!titleInput) return;

        const formData = {
            title: titleInput.value.trim(),
            description: descInput ? descInput.value.trim() : '',
            due_date: dueDateInput && dueDateInput.value ? dueDateInput.value : null,
            priority: prioritySelect ? prioritySelect.value : 'medium',
            recurrence: recurrenceSelect ? recurrenceSelect.value : 'none'
        };

        if (!formData.title) {
            this.showToast('Task title is required', 'error');
            return;
        }

        try {
            if (this.selectedTaskId) {
                await taskManager.updateTask(this.selectedTaskId, formData);
                this.showToast('Task updated successfully', 'success');
            } else {
                await taskManager.createTask(formData);
                this.showToast('Task created successfully', 'success');
            }

            this.closeTaskModal();
            await this.renderTasks();
            await this.updateStats();
        } catch (error) {
            this.showToast('Error saving task. Please try again.', 'error');
        }
    }

    openConfirmModal(taskId) {
        this.selectedTaskId = taskId;
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('hidden');
    }

    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.add('hidden');
        this.selectedTaskId = null;
    }

    async confirmDelete() {
        if (this.selectedTaskId) {
            try {
                await taskManager.deleteTask(this.selectedTaskId);
                this.showToast('Task deleted successfully', 'success');
                await this.renderTasks();
                await this.updateStats();
            } catch (error) {
                this.showToast('Error deleting task', 'error');
            }
        }
        this.closeConfirmModal();
    }

    async toggleTaskComplete(taskId) {
        try {
            await taskManager.toggleComplete(taskId);
            this.showToast('Task status updated', 'success');
            await this.renderTasks();
            await this.updateStats();
        } catch (error) {
            this.showToast('Error updating task', 'error');
        }
    }

    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        if (!filter) return;

        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        taskManager.setFilter(filter);
        this.renderTasks();
    }

    handleSearch(e) {
        taskManager.setSearchQuery(e.target.value);
        this.renderTasks();
    }

    setView(view) {
        this.currentView = view;

        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        const viewBtn = document.getElementById(`${view}ViewBtn`);
        if (viewBtn) viewBtn.classList.add('active');

        this.renderTasks();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        this.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3000);

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => toast.remove());
        }

        return toast;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
        if (modalId === 'taskModal' || modalId === 'confirmModal') {
            this.selectedTaskId = null;
        }
    }

    async getAISuggestions() {
        const titleInput = document.getElementById('taskTitle');

        if (!titleInput || titleInput.value.trim().length < 3) {
            this.showToast('Enter some text to get AI suggestions', 'warning');
            return;
        }

        try {
            this.showToast('Getting AI suggestions...', 'info');
            const suggestions = await taskManager.getSuggestions(titleInput.value.trim());
            this.displaySuggestions(suggestions);
        } catch (error) {
            this.showToast('Error getting AI suggestions', 'error');
        }
    }

    displaySuggestions(suggestions) {
        let suggestionsContainer = document.getElementById('suggestionsContainer');

        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'suggestionsContainer';
            suggestionsContainer.className = 'suggestions-container';
            const form = document.querySelector('.task-form');
            if (form) form.appendChild(suggestionsContainer);
        }

        suggestionsContainer.innerHTML = `
            <div class="suggestions-header">
                <h4>🤖 AI Suggestions</h4>
                <button onclick="this.parentElement.parentElement.remove()" class="close-suggestions">×</button>
            </div>
            <div class="suggestion-section">
                <h5>Suggested Titles:</h5>
                ${suggestions.titles.map(title =>
            `<button type="button" class="suggestion-btn" onclick="uiManager.useSuggestion('title', '${this.escapeHtml(title)}')">${title}</button>`
        ).join('')}
            </div>
            <div class="suggestion-section">
                <h5>Suggested Descriptions:</h5>
                ${suggestions.descriptions.map(desc =>
            `<button type="button" class="suggestion-btn" onclick="uiManager.useSuggestion('description', '${this.escapeHtml(desc)}')">${desc}</button>`
        ).join('')}
            </div>
        `;
    }

    useSuggestion(type, value) {
        if (type === 'title') {
            document.getElementById('taskTitle').value = value;
        } else if (type === 'description') {
            document.getElementById('taskDescription').value = value;
        }

        const suggestionsContainer = document.getElementById('suggestionsContainer');
        if (suggestionsContainer) suggestionsContainer.remove();
    }

    async predictDueDate() {
        if (this.selectedTaskId) {
            try {
                const prediction = await taskManager.predictDueDate(this.selectedTaskId);
                if (prediction) {
                    const date = new Date(prediction.predicted_due_date);
                    this.showToast(`Suggested due date: ${date.toLocaleDateString()}`, 'info');
                }
            } catch (error) {
                this.showToast('Error predicting due date', 'error');
            }
        } else {
            this.showToast('Create or select a task first', 'warning');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

const uiManager = new UIManager();