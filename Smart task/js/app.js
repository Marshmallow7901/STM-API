class SmartTaskManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadTheme();
        this.showWelcomeMessage();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    showWelcomeMessage() {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setTimeout(() => {
                uiManager.showToast('Welcome to Smart Task Manager!', 'success');
                localStorage.setItem('hasSeenWelcome', 'true');
            }, 1000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SmartTaskManager();
});

window.taskManager = taskManager;
window.uiManager = uiManager;