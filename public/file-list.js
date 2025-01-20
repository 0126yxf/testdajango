document.addEventListener('DOMContentLoaded', async function() {
    // 检查登录状态
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('验证失败:', error);
        window.location.href = '/login.html';
        return;
    }

    // 加载文件列表
    await loadFileList();
});

async function loadFileList() {
    const fileListElement = document.getElementById('fileList');
    
    try {
        const response = await fetch('/api/files', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('获取列表失败');
        }

        const files = await response.json();
        
        // 清空现有列表
        fileListElement.innerHTML = '';
        
        // 添加文件列表
        files.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${file.title}</td>
                <td>${new Date(file.created_at).toLocaleString()}</td>
                <td>${file.required_signs}人</td>
                <td>
                    <button onclick="viewFile(${file.id})">查看</button>
                    <button onclick="deleteFile(${file.id})">删除</button>
                </td>
            `;
            fileListElement.appendChild(row);
        });

    } catch (error) {
        console.error('加载列表失败:', error);
        alert('加载列表失败: ' + error.message);
    }
}

// 查看文件
window.viewFile = async function(id) {
    try {
        const response = await fetch(`/api/files/${id}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('获取文件失败');
        }

        // 打开新窗口显示文件
        window.open(`/api/files/${id}/content`, '_blank');

    } catch (error) {
        console.error('查看文件失败:', error);
        alert('查看文件失败: ' + error.message);
    }
};

// 添加文件操作功能
function createFileActions(file) {
    return `
        <button onclick="previewFile(${file.id})">预览</button>
        <button onclick="downloadFile(${file.id})">下载</button>
        <button onclick="deleteFile(${file.id})">删除</button>
    `;
}

// 预览文件
window.previewFile = function(id) {
    window.open(`/api/files/${id}/preview`, '_blank');
};

// 下载文件
window.downloadFile = function(id) {
    window.location.href = `/api/files/${id}/download`;
};

// 删除文件
window.deleteFile = async function(id) {
    if (!confirm('确定要删除此文件吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/files/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除失败');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }

        alert('删除成功');
        loadFileList();  // 重新加载列表
    } catch (error) {
        console.error('删除失败:', error);
        alert(error.message || '删除失败');
    }
};

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 修改文件列表渲染
function renderFileList(files) {
    const fileListElement = document.getElementById('fileList');
    fileListElement.innerHTML = files.map(file => `
        <tr>
            <td>${file.title}</td>
            <td>${formatFileSize(file.file_size)}</td>
            <td>${file.required_signs}人</td>
            <td>${new Date(file.created_at).toLocaleString()}</td>
            <td>${createFileActions(file)}</td>
        </tr>
    `).join('');
} 