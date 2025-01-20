// 检查登录状态
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('未登录或会话已过期');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || '验证失败');
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', async function() {
    if (!(await checkAuth())) {
        return;
    }

    // 添加搜索功能
    const searchInput = document.getElementById('searchInput');
    let filesList = []; // 保存完整的文件列表

    // 加载文件列表
    loadFileList();

    // 定期检查登录状态
    setInterval(checkAuth, 5 * 60 * 1000); // 每5分钟检查一次
});

// 加载文件列表
async function loadFileList() {
    const fileListElement = document.getElementById('fileList');
    const searchInput = document.getElementById('searchInput');
    
    try {
        // 显示加载状态
        fileListElement.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    <div class="loading"></div>
                    <div>加载中...</div>
                </td>
            </tr>
        `;

        const response = await fetch('/api/files', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('获取列表失败');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || '获取列表失败');
        }

        filesList = result.data;
        
        // 如果有搜索关键词，应用搜索过滤
        const keyword = searchInput.value.trim();
        if (keyword) {
            searchFiles(keyword);
        } else {
            renderFileList(filesList);
        }

    } catch (error) {
        console.error('Failed to load files:', error);
        fileListElement.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">
                    加载失败: ${error.message}
                </td>
            </tr>
        `;
    }
}

// 渲染文件列表
function renderFileList(files) {
    const fileListElement = document.getElementById('fileList');
    if (!files || files.length === 0) {
        fileListElement.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">📂</div>
                        <div class="empty-state-text">暂无文件，请先上传文件</div>
                        <button class="button button-primary" onclick="window.location.href='/upload.html'">
                            上传文件
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    fileListElement.innerHTML = files.map(file => {
        const fileData = JSON.stringify({
            id: file.id,
            title: file.title,
            shareLink: file.shareLink
        });
        
        const isCompleted = file.current_signs >= file.required_signs;
        
        return `
            <tr>
                <td data-label="文件标题">
                    <div class="file-title">${file.title}</div>
                </td>
                <td data-label="文件大小">
                    <div class="file-size">${formatFileSize(file.file_size)}</div>
                </td>
                <td data-label="签名状态">
                    <span class="status-badge ${isCompleted ? 'status-complete' : 'status-pending'}">
                        ${file.status}
                    </span>
                </td>
                <td data-label="上传时间">
                    <div class="time-info">${formatDateTime(file.created_at)}</div>
                </td>
                <td data-label="操作">
                    <div class="action-buttons">
                        <button class="action-button share-button" onclick='showShareDialog(${fileData})'>
                            <i>🔗</i>分享
                        </button>
                        <button class="action-button preview-button" onclick="previewFile('${file.id}')">
                            <i>👁️</i>预览
                        </button>
                        <button class="action-button download-button" onclick="downloadFile('${file.id}')">
                            <i>⬇️</i>下载
                        </button>
                        <button class="action-button delete-button" onclick="deleteFile('${file.id}')">
                            <i>🗑️</i>删除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 预览文件
window.previewFile = async function(id) {
    try {
        const response = await fetch(`/api/files/${id}/preview-with-signatures`, {
            credentials: 'include'  // 添加凭证
        });

        if (!response.ok) {
            throw new Error('获取预览失败');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }

        const { file, signatures } = result.data;
        
        // 创建预览对话框
        const dialog = document.createElement('div');
        dialog.className = 'preview-dialog';
        dialog.innerHTML = `
            <div class="preview-content">
                <button class="preview-close" onclick="closePreviewDialog()">×</button>
                <h3>${file.title}</h3>
                <div class="preview-container">
                    <iframe src="/api/files/${id}/preview" frameborder="0"></iframe>
                </div>
                <div class="signatures-list">
                    <h4>签名记录 (${signatures.length})</h4>
                    ${signatures.map(sig => `
                        <div class="signature-item">
                            <div class="signature-info">
                                <p>签名人：${sig.signer_name}</p>
                                <p>时间：${sig.created_at}</p>
                            </div>
                            <div class="signature-image">
                                <img src="${sig.signature_data}" alt="签名">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 点击背景关闭对话框
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closePreviewDialog();
            }
        });

        // 阻止冒泡
        dialog.querySelector('.preview-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

    } catch (error) {
        console.error('Preview failed:', error);
        alert('预览失败: ' + error.message);
    }
};

// 关闭预览对话框
window.closePreviewDialog = function() {
    const dialog = document.querySelector('.preview-dialog');
    if (dialog) {
        dialog.remove();
    }
};

// 下载文件
window.downloadFile = function(id) {
    window.location.href = `/api/files/${id}/download`;
};

// 删除文件
window.deleteFile = async function(id) {
    if (!confirm('确定要删除此文件吗？此操作不可恢复！')) {
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
        console.error('Delete failed:', error);
        alert(error.message || '删除失败');
    }
};

// 退出登录
window.logout = async function() {
    if (!confirm('确定要退出登录吗？')) {
        return;
    }

    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('退出失败');
        }

        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        alert(error.message || '退出失败');
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

// 显示分享对话框
function showShareDialog(fileData) {
    try {
        const dialog = document.createElement('div');
        dialog.className = 'share-dialog';
        dialog.innerHTML = `
            <div class="share-content">
                <h3>分享文件</h3>
                <div class="qr-code">
                    <canvas id="qrCanvas"></canvas>
                </div>
                <div class="share-link">
                    <p>分享链接：</p>
                    <div class="link-box">
                        <input type="text" value="${fileData.shareLink}" readonly>
                        <button onclick="copyShareLink(this)">复制</button>
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button onclick="closeShareDialog()">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 生成二维码
        QRCode.toCanvas(document.getElementById('qrCanvas'), fileData.shareLink, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // 点击背景关闭对话框
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeShareDialog();
            }
        });

        // 阻止冒泡
        dialog.querySelector('.share-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

    } catch (error) {
        console.error('Failed to show share dialog:', error);
        alert('显示分享对话框失败: ' + error.message);
    }
}

// 复制分享链接
function copyShareLink(button) {
    const input = button.previousElementSibling;
    input.select();
    document.execCommand('copy');
    button.textContent = '已复制';
    setTimeout(() => {
        button.textContent = '复制';
    }, 2000);
}

// 关闭分享对话框
function closeShareDialog() {
    const dialog = document.querySelector('.share-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 格式化日期时间
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 搜索功能
function searchFiles(keyword) {
    if (!keyword.trim()) {
        renderFileList(filesList);
        return;
    }

    const searchResult = filesList.filter(file => 
        file.title.toLowerCase().includes(keyword.toLowerCase()) ||
        file.file_name.toLowerCase().includes(keyword.toLowerCase())
    );

    renderFileList(searchResult);
}

// 添加搜索输入事件监听
searchInput.addEventListener('input', debounce(function(e) {
    searchFiles(e.target.value);
}, 300));

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 刷新列表
window.refreshList = async function() {
    const refreshButton = document.querySelector('button[onclick="refreshList()"]');
    
    try {
        // 添加加载动画
        refreshButton.classList.add('refreshing');
        refreshButton.disabled = true;

        // 重新加载列表
        await loadFileList();

        // 显示成功提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = '刷新成功';
        document.body.appendChild(toast);

        // 3秒后移除提示
        setTimeout(() => {
            toast.remove();
        }, 3000);

    } catch (error) {
        console.error('Refresh failed:', error);
        alert('刷新失败: ' + error.message);
    } finally {
        // 移除加载动画
        refreshButton.classList.remove('refreshing');
        refreshButton.disabled = false;
    }
};

// 添加提示框样式
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 14px;
        animation: fadeInOut 3s ease-in-out;
        z-index: 1000;
    }

    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        10% { opacity: 1; transform: translate(-50%, 0); }
        90% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
    }
`;
document.head.appendChild(style); 