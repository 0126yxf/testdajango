document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('file');
    const selectedFileDiv = document.getElementById('selectedFile');
    const fileUploadArea = document.querySelector('.file-upload-area');

    // 文件拖拽上传
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#667eea';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.8)';
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#e1e1e1';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.5)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#e1e1e1';
        fileUploadArea.style.background = 'rgba(255, 255, 255, 0.5)';
        
        const file = e.dataTransfer.files[0];
        if (file) {
            fileInput.files = e.dataTransfer.files;
            updateFileInfo(file);
        }
    });

    // 文件选择处理
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            updateFileInfo(file);
        }
    });

    // 更新文件信息显示
    function updateFileInfo(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
            alert('不支持的文件类型！请上传 PDF 或图片文件（jpg, jpeg, png）');
            fileInput.value = '';
            return;
        }

        if (file.size > maxSize) {
            alert('文件大小超过限制！最大支持 10MB');
            fileInput.value = '';
            return;
        }

        selectedFileDiv.style.display = 'flex';
        selectedFileDiv.querySelector('.file-name').textContent = file.name;
        selectedFileDiv.querySelector('.file-size').textContent = formatFileSize(file.size);
    }

    // 表单提交处理
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('title').value.trim();
        const requiredSigns = document.getElementById('requiredSigns').value;
        const file = fileInput.files[0];
        const submitButton = form.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('.button-text');

        if (!title || !requiredSigns || !file) {
            alert('请填写所有必填项！');
            return;
        }

        try {
            // 禁用提交按钮并显示加载状态
            submitButton.disabled = true;
            buttonText.innerHTML = '<span class="loading-spinner"></span>上传中...';

            const formData = new FormData();
            formData.append('title', title);
            formData.append('requiredSigns', requiredSigns);
            formData.append('file', file);

            const response = await fetch('/api/files', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '上传失败');
            }

            if (!result.success) {
                throw new Error(result.message || '上传失败');
            }

            alert('上传成功！');
            window.location.href = '/admin.html';

        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.message || '上传失败，请重试');
        } finally {
            // 恢复提交按钮状态
            submitButton.disabled = false;
            buttonText.textContent = '上传文件';
        }
    });

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 