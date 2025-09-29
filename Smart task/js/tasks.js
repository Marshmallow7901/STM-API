const API_BASE_URL = 'http://localhost:5000/api';

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async getTasks(filter = 'all', search = '') {
        try {
            const params = new URLSearchParams();

            if (filter === 'pending') params.append('completed', 'false');
            else if (filter === 'completed') params.append('completed', 'true');

            if (search) params.append('search', search);

            const endpoint = `/tasks${params.toString() ? `?${params.toString()}` : ''}`;
            const result = await this.apiCall(endpoint);

            this.tasks = result.data || [];
            return this.tasks;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            this.showError('Cannot connect to API server. Make sure it is running on port 5000.');
            this.tasks = [];
            return [];
        }
    }

    async getTaskById(id) {
        try {
            const result = await this.apiCall(`/tasks/${id}`);
            return result.data;
        } catch (error) {
            console.error('Error fetching task:', error);
            return null;
        }
    }

    async createTask(taskData) {
        try {
            const result = await this.apiCall('/tasks', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });

            return result.data;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async updateTask(id, taskData) {
        try {
            const result = await this.apiCall(`/tasks/${id}`, {
                method: 'PUT',
                body: JSON.stringify(taskData)
            });

            return result.data;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async deleteTask(id) {
        try {
            const result = await this.apiCall(`/tasks/${id}`, {
                method: 'DELETE'
            });

            return result.success;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async toggleComplete(id) {
        try {
            const result = await this.apiCall(`/tasks/${id}/toggle`, {
                method: 'PATCH'
            });

            return result.data;
        } catch (error) {
            console.error('Error toggling task:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const result = await this.apiCall('/tasks-stats');
            return result.data;
        } catch (error) {
            console.error('Error fetching stats:', error);
            return { total: 0, completed: 0, pending: 0, overdue: 0 };
        }
    }

    async getSuggestions(input) {
        try {
            const result = await this.apiCall('/tasks/suggest', {
                method: 'POST',
                body: JSON.stringify({ input })
            });

            return result.data;
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return { titles: [], descriptions: [], tags: [] };
        }
    }

    async predictDueDate(taskId) {
        try {
            const result = await this.apiCall(`/tasks/${taskId}/predict-due-date`, {
                method: 'POST'
            });

            return result.data;
        } catch (error) {
            console.error('Error predicting due date:', error);
            return null;
        }
    }

    showError(message) {
        const existingError = document.querySelector('.api-error');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'api-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        errorDiv.innerHTML = `
            <strong>⚠️ Connection Error</strong>
            <p style="margin: 5px 0; font-size: 14px;">${message}</p>
            <button onclick="this.parentElement.remove()" style="background: white; color: #ff6b6b; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;">Dismiss</button>
        `;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    setFilter(filter) {
        this.currentFilter = filter;
    }

    setSearchQuery(query) {
        this.searchQuery = query;
    }
}

const taskManager = new TaskManager();