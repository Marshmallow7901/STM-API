import express from 'express';
import cors from 'cors';
import fs from 'fs';
import cron from 'node-cron';

const app = express();
const PORT = 5000;
const DATA_FILE = './tasks.json';

app.use(cors());
app.use(express.json());

class TaskService {
    constructor() {
        this.tasks = this.loadTasks();
    }

    loadTasks() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = fs.readFileSync(DATA_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.log('No existing tasks file, starting fresh');
        }

        const sampleTasks = [
            {
                id: this.generateId(),
                title: 'Complete project proposal',
                description: 'Finish the project proposal document',
                due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                completed: false,
                priority: 'high',
                recurrence: 'none',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: this.generateId(),
                title: 'Team meeting preparation',
                description: 'Prepare agenda for weekly meeting',
                due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                completed: false,
                priority: 'medium',
                recurrence: 'weekly',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        this.saveTasks(sampleTasks);
        return sampleTasks;
    }

    saveTasks(tasks = this.tasks) {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    getAllTasks(filters = {}) {
        let filteredTasks = [...this.tasks];

        if (filters.completed !== undefined) {
            filteredTasks = filteredTasks.filter(task =>
                task.completed === (filters.completed === 'true')
            );
        }

        if (filters.priority) {
            filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredTasks = filteredTasks.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm)
            );
        }

        return filteredTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    getTaskById(id) {
        return this.tasks.find(task => task.id === id);
    }

    createTask(taskData) {
        const task = {
            id: this.generateId(),
            title: taskData.title,
            description: taskData.description || '',
            due_date: taskData.due_date || null,
            completed: false,
            priority: taskData.priority || 'medium',
            recurrence: taskData.recurrence || 'none',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        return task;
    }

    updateTask(id, taskData) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        if (taskIndex === -1) return null;

        this.tasks[taskIndex] = {
            ...this.tasks[taskIndex],
            ...taskData,
            updated_at: new Date().toISOString()
        };

        this.saveTasks();
        return this.tasks[taskIndex];
    }

    deleteTask(id) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        if (taskIndex === -1) return null;

        const deletedTask = this.tasks.splice(taskIndex, 1)[0];
        this.saveTasks();
        return deletedTask;
    }

    getTaskStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;
        const overdue = this.tasks.filter(task =>
            task.due_date && new Date(task.due_date) < new Date() && !task.completed
        ).length;

        return { total, completed, pending, overdue };
    }
}

class AIService {
    static suggestTaskDetails(input) {
        if (!input || input.length < 3) {
            return this.getDefaultSuggestions();
        }

        const words = input.toLowerCase().split(' ').filter(word => word.length > 2);

        const suggestions = {
            titles: [],
            descriptions: [],
            tags: []
        };

        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
        const meaningfulWords = words.filter(word => !stopWords.includes(word));

        if (meaningfulWords.length > 0) {
            suggestions.titles.push(
                `Complete ${meaningfulWords[0]} task`,
                `Review ${meaningfulWords[0]}`,
                `Work on ${meaningfulWords.slice(0, 2).join(' ')}`
            );

            suggestions.descriptions.push(
                `Important task related to ${meaningfulWords.join(', ')}`,
                `Remember to focus on ${meaningfulWords[0]} completion`
            );

            suggestions.tags = meaningfulWords.slice(0, 5);
        }

        return suggestions;
    }

    static getDefaultSuggestions() {
        return {
            titles: ['Complete important task', 'Review pending items', 'Follow up on action items'],
            descriptions: ['This task requires your attention', 'Set a realistic deadline for this task'],
            tags: ['important', 'pending', 'action']
        };
    }

    static predictDueDate(taskTitle, taskDescription) {
        const content = `${taskTitle} ${taskDescription}`.toLowerCase();
        let predictedDays = 7;

        if (content.includes('urgent') || content.includes('asap')) {
            predictedDays = 1;
        } else if (content.includes('soon') || content.includes('quick')) {
            predictedDays = 3;
        } else if (content.includes('long') || content.includes('research')) {
            predictedDays = 14;
        }

        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + predictedDays);

        return predictedDate;
    }
}

const taskService = new TaskService();

const validateTask = (taskData, isUpdate = false) => {
    const errors = [];

    if (!isUpdate || taskData.title !== undefined) {
        if (!taskData.title || taskData.title.trim().length === 0) {
            errors.push('Title is required');
        } else if (taskData.title.length > 200) {
            errors.push('Title must be less than 200 characters');
        }
    }

    if (taskData.description && taskData.description.length > 1000) {
        errors.push('Description must be less than 1000 characters');
    }

    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
        errors.push('Priority must be low, medium, or high');
    }

    if (taskData.recurrence && !['none', 'daily', 'weekly', 'monthly'].includes(taskData.recurrence)) {
        errors.push('Recurrence must be none, daily, weekly, or monthly');
    }

    return errors;
};

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Smart Task Manager API'
    });
});

app.get('/api/tasks', (req, res) => {
    try {
        const filters = {
            completed: req.query.completed,
            priority: req.query.priority,
            search: req.query.search
        };

        const tasks = taskService.getAllTasks(filters);
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/tasks/:id', (req, res) => {
    try {
        const task = taskService.getTaskById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/tasks', (req, res) => {
    try {
        const errors = validateTask(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const task = taskService.createTask(req.body);
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/tasks/:id', (req, res) => {
    try {
        const errors = validateTask(req.body, true);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const task = taskService.updateTask(req.params.id, req.body);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    try {
        const task = taskService.deleteTask(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/tasks-stats', (req, res) => {
    try {
        const stats = taskService.getTaskStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/tasks/suggest', (req, res) => {
    try {
        const { input } = req.body;

        if (!input || input.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Input text is required' });
        }

        const suggestions = AIService.suggestTaskDetails(input.trim());
        res.json({ success: true, data: suggestions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/tasks/:id/predict-due-date', (req, res) => {
    try {
        const task = taskService.getTaskById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        const predictedDate = AIService.predictDueDate(task.title, task.description || '');

        res.json({
            success: true,
            data: {
                task_id: task.id,
                predicted_due_date: predictedDate.toISOString(),
                message: 'Based on task content analysis'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
    try {
        const task = taskService.getTaskById(req.params.id);

        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        const updatedTask = taskService.updateTask(req.params.id, {
            completed: !task.completed,
            completed_at: !task.completed ? new Date().toISOString() : null
        });

        res.json({
            success: true,
            data: updatedTask,
            message: `Task marked as ${updatedTask.completed ? 'completed' : 'pending'}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

cron.schedule('0 * * * *', () => {
    try {
        console.log('Checking for due tasks...');

        const dueTasks = taskService.getAllTasks().filter(task => {
            if (!task.due_date || task.completed) return false;
            const dueDate = new Date(task.due_date);
            const now = new Date();
            const timeDiff = dueDate - now;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            return hoursDiff <= 24 && hoursDiff > 0;
        });

        if (dueTasks.length > 0) {
            console.log(`Found ${dueTasks.length} tasks due soon`);
        }
    } catch (error) {
        console.error('Error in reminder job:', error);
    }
});

cron.schedule('0 0 * * *', () => {
    try {
        console.log('Processing recurring tasks...');

        const recurringTasks = taskService.getAllTasks().filter(task =>
            task.recurrence !== 'none' && task.completed
        );

        recurringTasks.forEach(task => {
            let nextDueDate = new Date();

            switch (task.recurrence) {
                case 'daily':
                    nextDueDate.setDate(nextDueDate.getDate() + 1);
                    break;
                case 'weekly':
                    nextDueDate.setDate(nextDueDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                    break;
            }

            taskService.createTask({
                title: task.title,
                description: task.description,
                due_date: nextDueDate.toISOString(),
                priority: task.priority,
                recurrence: task.recurrence
            });
        });

        console.log(`Created ${recurringTasks.length} recurring tasks`);
    } catch (error) {
        console.error('Error in recurring tasks job:', error);
    }
});

app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

app.listen(PORT, () => {
    console.log(`
🚀 Smart Task Manager API running!
📍 Port: ${PORT}
📁 Data: tasks.json
⏰ Cron jobs: Active

📚 Available endpoints:
   GET    /api/health
   GET    /api/tasks
   GET    /api/tasks/:id
   POST   /api/tasks
   PUT    /api/tasks/:id
   DELETE /api/tasks/:id
   GET    /api/tasks-stats
   POST   /api/tasks/suggest
   POST   /api/tasks/:id/predict-due-date
   PATCH  /api/tasks/:id/toggle
    `);
});