document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');
    const graphBtn = document.getElementById('graphBtn');
    const backBtn = document.getElementById('backBtn');
    const taskSection = document.getElementById('taskSection');
    const graphSection = document.getElementById('graphSection');
    const dataDisplay = document.getElementById('dataDisplay');
    
    // Add Reset Button
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    resetBtn.className = 'btn';
    resetBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Reset Data';
    resetBtn.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)';
    resetBtn.style.color = 'white';
    resetBtn.style.marginLeft = '10px';

    graphBtn.insertAdjacentElement('afterend', resetBtn);
    
    // Add Download Button
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'downloadBtn';
    downloadBtn.className = 'btn download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Graph';
    downloadBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    document.querySelector('.graph-header').appendChild(downloadBtn);

    // Data
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let efficiencyData = JSON.parse(localStorage.getItem('efficiencyData')) || [];
    let activityTimers = {};
    let lastEfficiencyUpdate = Date.now();
    const TARGET_COMPLETION_TIME = 30; // Target minutes per task

    // Initialize activity timers
    tasks.forEach(task => {
        if (!task.completed) {
            activityTimers[task.id] = (Date.now() - new Date(task.createdAt).getTime()) / 60000;
        }
    });

    // Initialize Chart
    let chart = null;
    const initChart = () => {
        if (chart) chart.destroy();
        const ctx = document.getElementById('efficiencyChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: efficiencyData.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: 'Progress %',
                    data: efficiencyData.map(d => d.efficiency),
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: { y: { min: 0, max: 100 } },
                animation: {
                    duration: 1000
                }
            }
        });
    };
    
    const updateDataDisplay = () => {
        const completedTasks = tasks.filter(t => t.completed);
        const pendingTasks = tasks.filter(t => !t.completed);
        
        dataDisplay.innerHTML = `
            <h3>Progress (Updated: ${new Date().toLocaleTimeString()})</h3>
            <p>Total Activities: ${tasks.length}</p>
            <p>Completed: ${completedTasks.length} (${tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%)</p>
            <p>Pending: ${pendingTasks.length} (${tasks.length ? Math.round((pendingTasks.length / tasks.length) * 100) : 0}%)</p>
            <h4>Recent Efficiency Data</h4>
            <pre>${JSON.stringify(efficiencyData.slice(-5), null, 2)}</pre>
        `;
    };
    
    // Completion Animation
    const showCompletionAnimation = (taskElement) => {
        taskElement.classList.add('completed-animation');
        setTimeout(() => {
            taskElement.classList.remove('completed-animation');
        }, 2000);
    };

    // Download Graph as Image
    const downloadGraph = () => {
        const canvas = document.getElementById('efficiencyChart');
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = 'productivity-graph-' + new Date().toISOString().slice(0,10) + '.png';
        link.href = image;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Efficiency Calculation
    const updateEfficiency = (triggeredByCompletion = false) => {
        const now = Date.now();
        
        // Update all ongoing task timers
        tasks.forEach(task => {
            if (!task.completed) {
                activityTimers[task.id] = (now - new Date(task.createdAt).getTime()) / 60000;
            }
        });

        // Only record every 5 minutes unless a task was just completed
        if (!triggeredByCompletion && (now - lastEfficiencyUpdate < 5 * 60 * 1000)) {
            return;
        }

        const activeTasks = tasks.filter(t => !t.completed);
        let avgTime = TARGET_COMPLETION_TIME; // Default if no active tasks
        
        if (activeTasks.length > 0) {
            const totalTime = activeTasks.reduce((sum, task) => sum + (activityTimers[task.id] || 0), 0);
            avgTime = totalTime / activeTasks.length;
        }

        const efficiency = Math.min(Math.round((TARGET_COMPLETION_TIME / Math.max(avgTime, 0.5)) * 100), 100);
        
        efficiencyData.push({
            timestamp: new Date(),
            efficiency,
            activeTasks: activeTasks.length,
            completedTasks: tasks.filter(t => t.completed).length
        });

        // Keep only last 100 data points
        if (efficiencyData.length > 100) {
            efficiencyData = efficiencyData.slice(-100);
        }

        lastEfficiencyUpdate = now;
        saveData();
        initChart();
    };

    // Reset all data function
    const resetAllData = () => {
        if (confirm('This will delete all tasks and efficiency data. Are you sure?')) {
            tasks = [];
            efficiencyData = [];
            activityTimers = {};
            saveData();
            renderTasks();
            initChart();
            updateDataDisplay();
        }
    };

    // Auto-update every 5 minutes
    setInterval(() => updateEfficiency(false), 5 * 60 * 1000);

    // Task Functions
    const renderTasks = () => {
        taskList.innerHTML = tasks.map(task => `
            <div class="task" data-id="${task.id}">
                <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-title">${task.title}</span>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        document.querySelectorAll('.checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleComplete);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

        // 初始化拖拽功能
        setupDragAndDrop();
    };

    // 拖拽功能实现
    const setupDragAndDrop = () => {
        const taskElements = document.querySelectorAll('.task');
        
        taskElements.forEach(task => {
            task.draggable = true;
            
            task.addEventListener('dragstart', function(e) {
                this.classList.add('dragging');
                e.dataTransfer.setData('text/plain', this.dataset.id);
            });
            
            task.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
        });
        
        taskList.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            if (!draggingItem) return;
            
            const afterElement = getDragAfterElement(taskList, e.clientY);
            
            if (afterElement == null) {
                taskList.appendChild(draggingItem);
            } else {
                taskList.insertBefore(draggingItem, afterElement);
            }
        });
        
        taskList.addEventListener('drop', function(e) {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            
            // 获取新顺序
            const newOrder = Array.from(taskList.querySelectorAll('.task')).map(el => parseInt(el.dataset.id));
            
            // 更新任务数组顺序
            const newTasks = [];
            newOrder.forEach(id => {
                const task = tasks.find(t => t.id === id);
                if (task) newTasks.push(task);
            });
            
            tasks = newTasks;
            saveData();
        });
    };

    // 获取拖拽后的位置
    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const handleComplete = (e) => {
        const taskElement = e.target.closest('.task');
        const taskId = parseInt(taskElement.dataset.id);
        const task = tasks.find(t => t.id === taskId);
        
        if (task) {
            task.completed = e.target.checked;
            task.completedAt = task.completed ? new Date() : null;
            
            if (task.completed) {
                // Record completion time
                activityTimers[task.id] = (task.completedAt - new Date(task.createdAt)) / 60000;
                
                // Reset timers for all other tasks
                tasks.forEach(t => {
                    if (!t.completed) {
                        t.createdAt = new Date();
                        activityTimers[t.id] = 0;
                    }
                });
                
                // Show completion animation
                showCompletionAnimation(taskElement);
                updateEfficiency(true);
            }
            
            saveData();
            updateDataDisplay();
        }
    };

    const handleDelete = (e) => {
        const taskId = parseInt(e.target.closest('.task').dataset.id);
        tasks = tasks.filter(t => t.id !== taskId);
        delete activityTimers[taskId];
        saveData();
        renderTasks();
        updateEfficiency(true);
    };

    // Event Listeners
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskTitle = taskInput.value.trim();
        if (taskTitle) {
            const newTask = {
                id: Date.now(),
                title: taskTitle,
                completed: false,
                createdAt: new Date()
            };
            tasks.push(newTask);
            activityTimers[newTask.id] = 0;
            taskInput.value = '';
            saveData();
            renderTasks();
            updateEfficiency(true);
        }
    });

    graphBtn.addEventListener('click', () => {
        taskSection.style.display = 'none';
        graphSection.style.display = 'block';
        initChart();
    });

    backBtn.addEventListener('click', () => {
        taskSection.style.display = 'block';
        graphSection.style.display = 'none';
    });

    resetBtn.addEventListener('click', resetAllData);
    downloadBtn.addEventListener('click', downloadGraph);

    // Save Data
    const saveData = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('efficiencyData', JSON.stringify(efficiencyData));
    };

    // Initial Setup
    renderTasks();
    updateDataDisplay();
    if (graphSection.style.display === 'block') {
        initChart();
    }

    // 添加拖拽样式
    if (!document.querySelector('style#drag-styles')) {
        const style = document.createElement('style');
        style.id = 'drag-styles';
        style.textContent = `
            .task {
                cursor: move;
                transition: transform 0.2s ease;
                user-select: none;
            }
            .task.dragging {
                opacity: 0.5;
                background: #f8f9fa;
            }
            #taskList {
                min-height: 100px;
            }
        `;
        document.head.appendChild(style);
    }
});