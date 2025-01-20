document.addEventListener('DOMContentLoaded', function() {
    // 获取URL参数中的告知书ID
    const urlParams = new URLSearchParams(window.location.search);
    const noticeId = urlParams.get('notice');
    
    if (!noticeId) {
        alert('无效的告知书链接！');
        return;
    }

    // 从localStorage获取告知书数据
    const notices = JSON.parse(localStorage.getItem('notices') || '[]');
    const notice = notices.find(n => n.id === parseInt(noticeId));
    
    if (!notice) {
        alert('找不到指定的告知书！');
        return;
    }

    // 显示告知书内容
    document.getElementById('noticeTitle').textContent = notice.title;
    document.getElementById('noticePdf').src = notice.content;

    // 检查是否已经签名
    const hasSignature = notice.signatures.some(sig => sig.clientId === getClientId());
    if (hasSignature) {
        // 如果已签名，显示已确认状态
        document.querySelector('.signature-section').innerHTML = `
            <h2>签名状态</h2>
            <div class="signature-status">
                <p class="confirmed">✓ 您已确认签字</p>
                <p class="confirm-time">确认时间：${
                    new Date(notice.signatures.find(sig => sig.clientId === getClientId()).datetime)
                    .toLocaleString()
                }</p>
            </div>
        `;
        return;
    }

    // 签名相关代码
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const [currentX, currentY] = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        [lastX, lastY] = [currentX, currentY];
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.type.includes('touch') 
            ? e.touches[0].clientX - rect.left 
            : e.clientX - rect.left;
        const y = e.type.includes('touch') 
            ? e.touches[0].clientY - rect.top 
            : e.clientY - rect.top;
        return [x, y];
    }

    document.getElementById('clearButton').addEventListener('click', function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    document.getElementById('saveButton').addEventListener('click', function() {
        const signatureImage = canvas.toDataURL('image/png');
        
        // 保存签名到告知书记录，添加客户端ID
        notice.signatures.push({
            datetime: new Date().toISOString(),
            signature: signatureImage,
            clientId: getClientId()
        });

        localStorage.setItem('notices', JSON.stringify(notices));
        alert('签名已保存！');
        location.reload(); // 刷新页面显示已确认状态
    });

    // 事件监听器
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
});

// 获取或生成客户端ID
function getClientId() {
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
        clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('clientId', clientId);
    }
    return clientId;
} 