// API 基础URL
const API_BASE_URL = '/api';

// 通用的错误处理函数
function handleError(error, defaultMessage = '操作失败') {
    console.error(error);
    alert(error.message || defaultMessage);
}

// 通用的 API 请求函数
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            } else {
                throw new Error('服务器错误');
            }
        }

        return await response.json();
    } catch (error) {
        handleError(error);
        throw error;
    }
}

// 检查登录状态
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        if (!response.ok) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// 格式化日期时间
function formatDateTime(date) {
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示加载动画
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
}

// 隐藏加载动画
function hideLoading(element) {
    element.innerHTML = '';
}

// 防抖函数
function debounce(func, wait) {
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

// 确认对话框
function confirmAction(message) {
    return confirm(message);
}

// 显示消息提示
function showMessage(message, type = 'info') {
    alert(message);
}

// 导出工具函数
window.utils = {
    handleError,
    fetchAPI,
    checkAuth,
    formatDateTime,
    formatFileSize,
    showLoading,
    hideLoading,
    debounce,
    confirmAction,
    showMessage
}; 