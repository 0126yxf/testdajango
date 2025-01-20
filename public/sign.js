document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // 获取URL参数中的文件ID
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('id');

    if (!fileId) {
        alert('无效的文件链接');
        window.location.href = '/';
        return;
    }

    // 加载文件信息
    loadFileInfo();

    // 设置画布大小
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 300;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.lineCap = 'round';
    }

    // 加载文件信息
    async function loadFileInfo() {
        try {
            const response = await fetch(`/api/files/${fileId}`);
            if (!response.ok) {
                throw new Error('获取文件信息失败');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || '获取文件信息失败');
            }

            const file = result.data;
            
            // 更新文件信息
            document.getElementById('fileTitle').textContent = file.title || '-';
            document.getElementById('fileName').textContent = file.file_name || '-';
            document.getElementById('uploadTime').textContent = file.created_at ? new Date(file.created_at).toLocaleString() : '-';
            document.getElementById('requiredSigns').textContent = file.required_signs || '0';
            document.getElementById('currentSigns').textContent = file.current_signs || '0';

            // 更新签名状态
            const isCompleted = file.current_signs >= file.required_signs;
            const signStatus = document.getElementById('signStatus');
            signStatus.textContent = isCompleted ? '已完成' : '待签名';
            signStatus.className = isCompleted ? 'status-complete' : 'status-pending';

            // 如果已完成，隐藏签名区域
            if (isCompleted) {
                const signatureSection = document.querySelector('.signature-section');
                if (signatureSection) {
                    signatureSection.innerHTML = `
                        <div class="status-message success">
                            <h3>✓ 签名已完成</h3>
                            <p>该文件已收集到足够的签名数量</p>
                        </div>
                    `;
                }
            }

            // 设置预览
            const previewFrame = document.getElementById('filePreview');
            if (previewFrame) {
                previewFrame.src = file.previewUrl;
            }

        } catch (error) {
            console.error('Failed to load file:', error);
            alert('加载文件失败: ' + error.message);
        }
    }

    // 画布事件监听
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        const coordinates = getCoordinates(e);
        [lastX, lastY] = coordinates;
        
        // 立即开始绘制一个点
        ctx.beginPath();
        ctx.arc(lastX, lastY, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const [currentX, currentY] = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        
        // 使用二次贝塞尔曲线使线条更平滑
        const controlX = (lastX + currentX) / 2;
        const controlY = (lastY + currentY) / 2;
        ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
        
        ctx.stroke();
        [lastX, lastY] = [currentX, currentY];
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if (e.type.includes('touch')) {
            const touch = e.touches[0];
            // 使用 pageX/pageY 并考虑滚动位置
            x = touch.pageX - (rect.left + window.pageXOffset);
            y = touch.pageY - (rect.top + window.pageYOffset);
        } else {
            // 使用 clientX/clientY 获取更准确的鼠标位置
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        // 根据画布的实际尺寸和显示尺寸计算缩放
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return [x * scaleX, y * scaleY];
    }

    function handleTouch(e) {
        e.preventDefault();
        if (e.type === 'touchstart') {
            startDrawing(e);
        } else if (e.type === 'touchmove') {
            draw(e);
        }
    }

    // 清除签名
    window.clearSignature = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // 提交签名
    window.submitSignature = async function() {
        const signerName = document.getElementById('signerName').value.trim();

        // 获取画布上的像素数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // 检查是否有任何非透明像素
        let hasSignature = false;
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 0) {
                hasSignature = true;
                break;
            }
        }

        if (!hasSignature) {
            showMessage('请先在签名区域签名', 'error');
            return;
        }

        try {
            // 显示加载状态
            const submitButton = document.querySelector('button[onclick="submitSignature()"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = '签名提交中...';

            const signatureData = canvas.toDataURL('image/png');
            const response = await fetch(`/api/files/${fileId}/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    signatureData,
                    signerName: signerName || '匿名签名'
                })
            });

            if (!response.ok) {
                throw new Error('签名提交失败');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || '签名提交失败');
            }

            // 显示成功动画
            showSuccessAnimation(() => {
                // 动画结束后重新加载页面
                window.location.reload();
            });

        } catch (error) {
            console.error('Signature submission failed:', error);
            showMessage(error.message || '签名失败，请重试', 'error');
            
            // 恢复按钮状态
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    };

    // 显示消息提示
    function showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-toast ${type}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // 添加显示类
        setTimeout(() => messageDiv.classList.add('show'), 10);

        // 3秒后移除
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }

    // 显示成功动画
    function showSuccessAnimation(callback) {
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-animation">
                <div class="checkmark-circle">
                    <div class="checkmark draw"></div>
                </div>
                <h2>签收成功！</h2>
                <p>文件已完成签名</p>
            </div>
        `;
        document.body.appendChild(overlay);

        // 2秒后执行回调
        setTimeout(callback, 2000);
    }

    // 全屏预览功能
    window.toggleFullscreen = function() {
        const previewContainer = document.querySelector('.file-preview');
        if (!previewContainer) return;

        // 切换全屏类
        previewContainer.classList.toggle('fullscreen');

        // 更新按钮文本
        const button = document.querySelector('.preview-actions button');
        if (button) {
            button.textContent = previewContainer.classList.contains('fullscreen') ? '退出全屏' : '全屏预览';
        }

        // 如果是全屏模式，添加 ESC 键监听
        if (previewContainer.classList.contains('fullscreen')) {
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    previewContainer.classList.remove('fullscreen');
                    button.textContent = '全屏预览';
                    // 移除监听器
                    document.removeEventListener('keydown', escHandler);
                }
            });
        }
    };

    // 添加点击空白区域退出全屏的功能
    document.addEventListener('click', function(e) {
        const previewContainer = document.querySelector('.file-preview');
        const button = document.querySelector('.preview-actions button');
        
        if (previewContainer && previewContainer.classList.contains('fullscreen')) {
            // 检查点击是否在预览区域外
            if (!e.target.closest('.preview-container') && !e.target.closest('.preview-actions')) {
                previewContainer.classList.remove('fullscreen');
                if (button) {
                    button.textContent = '全屏预览';
                }
            }
        }
    });

    // 添加窗口大小变化监听，在必要时退出全屏
    window.addEventListener('resize', function() {
        const previewContainer = document.querySelector('.file-preview');
        const button = document.querySelector('.preview-actions button');
        
        if (window.innerWidth < 768 && previewContainer && previewContainer.classList.contains('fullscreen')) {
            previewContainer.classList.remove('fullscreen');
            if (button) {
                button.textContent = '全屏预览';
            }
        }
    });

    // 添加屏幕方向变化监听
    window.addEventListener('orientationchange', function() {
        // 延迟执行以确保方向变化完成
        setTimeout(() => {
            const previewContainer = document.querySelector('.preview-container');
            if (previewContainer) {
                // 根据方向更新预览容器样式
                if (window.orientation === 90 || window.orientation === -90) {
                    previewContainer.style.paddingBottom = '56.25%';
                } else {
                    previewContainer.style.paddingBottom = '100%';
                }
            }
        }, 100);
    });

    // 添加返回按钮处理
    window.addEventListener('popstate', function() {
        const previewContainer = document.querySelector('.file-preview');
        if (previewContainer && previewContainer.classList.contains('fullscreen-preview')) {
            toggleFullscreen();
        }
    });

    // 初始化
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}); 