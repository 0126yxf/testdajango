// 检查用户是否已登录
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isAdminPage = window.location.pathname.endsWith('admin.html');
    
    console.log('当前路径:', window.location.pathname);
    console.log('Token状态:', token ? '存在' : '不存在');
    
    // 如果在登录页面且已有token，跳转到管理页
    if (token && isLoginPage) {
        console.log('已登录，跳转到管理页');
        window.location.href = '/admin.html';
        return false;
    }
    
    // 如果在管理页面且没有token，跳转到登录页
    if (!token && isAdminPage) {
        console.log('未登录，跳转到登录页');
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

// 只在管理页面检查认证状态
if (window.location.pathname.endsWith('admin.html')) {
    document.addEventListener('DOMContentLoaded', checkAuth);
} 