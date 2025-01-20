document.addEventListener('DOMContentLoaded', function() {
    // 存储告知书和签名记录
    let notices = JSON.parse(localStorage.getItem('notices') || '[]');

    const noticeForm = document.getElementById('noticeForm');
    const searchInput = document.getElementById('searchInput');
    const dateFilter = document.getElementById('dateFilter');
    const searchButton = document.getElementById('searchButton');
    const recordsList = document.getElementById('recordsList');

    // 处理告知书上传
    noticeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('noticeTitle').value;
        const file = document.getElementById('noticeFile').files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const notice = {
                    id: Date.now(),
                    title: title,
                    fileName: file.name, // 保存文件名
                    content: e.target.result,
                    datetime: new Date().toISOString(),
                    signatures: []
                };
                
                notices.push(notice);
                localStorage.setItem('notices', JSON.stringify(notices));
                renderRecords();
                noticeForm.reset();
            };
            reader.readAsDataURL(file);
        }
    });

    // 渲染记录列表
    function renderRecords() {
        recordsList.innerHTML = '';
        notices.forEach(notice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(notice.datetime).toLocaleString()}</td>
                <td>${notice.title}</td>
                <td>
                    <a href="${notice.content}" target="_blank" class="file-link">
                        ${notice.fileName}
                    </a>
                </td>
                <td>
                    <span class="signature-count">${notice.signatures.length} 个签名</span>
                    ${notice.signatures.length > 0 ? `
                        <button class="view-signatures" onclick="viewSignatures(${notice.id})">
                            查看签名
                        </button>
                    ` : ''}
                </td>
                <td class="action-buttons">
                    <button class="view-button" onclick="viewNotice(${notice.id})">预览</button>
                    <button class="share-button" onclick="shareNotice(${notice.id})">分享链接</button>
                    <button class="delete-button" onclick="deleteNotice(${notice.id})">删除</button>
                </td>
            `;
            recordsList.appendChild(row);
        });
    }

    // 搜索功能
    searchButton.addEventListener('click', function() {
        const searchText = searchInput.value.toLowerCase();
        const selectedDate = dateFilter.value;
        
        const filteredNotices = notices.filter(notice => {
            const matchText = notice.title.toLowerCase().includes(searchText);
            const matchDate = !selectedDate || notice.datetime.startsWith(selectedDate);
            return matchText && matchDate;
        });
        
        renderFilteredRecords(filteredNotices);
    });

    // 查看告知书
    window.viewNotice = function(id) {
        const notice = notices.find(n => n.id === id);
        if (notice) {
            const modal = document.createElement('div');
            modal.className = 'file-preview-modal';
            modal.innerHTML = `
                <div class="file-preview-content">
                    <h3>${notice.title}</h3>
                    <div class="file-info">
                        <p>文件名：${notice.fileName}</p>
                        <p>上传时间：${new Date(notice.datetime).toLocaleString()}</p>
                    </div>
                    <div class="file-preview">
                        <iframe src="${notice.content}" width="100%" height="500px"></iframe>
                    </div>
                    <button class="close-modal" onclick="this.parentElement.parentElement.remove()">关闭</button>
                </div>
            `;
            document.body.appendChild(modal);
        }
    };

    // 修改分享链接功能
    window.shareNotice = function(id) {
        const notice = notices.find(n => n.id === id);
        if (!notice) return;

        const shareUrl = `${window.location.origin}/index.html?notice=${id}`;
        
        // 创建模态框显示二维码
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.innerHTML = `
            <div class="qr-modal-content">
                <h3>${notice.title}</h3>
                <div id="qrcode"></div>
                <div class="qr-info">
                    <p>扫描二维码访问签名页面</p>
                    <input type="text" value="${shareUrl}" readonly>
                    <button onclick="copyShareUrl(this)">复制链接</button>
                </div>
                <button class="close-modal" onclick="this.parentElement.parentElement.remove()">关闭</button>
            </div>
        `;
        document.body.appendChild(modal);

        // 生成二维码
        new QRCode(document.getElementById('qrcode'), {
            text: shareUrl,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    };

    // 添加复制链接功能
    window.copyShareUrl = function(button) {
        const input = button.previousElementSibling;
        input.select();
        document.execCommand('copy');
        button.textContent = '已复制';
        setTimeout(() => button.textContent = '复制链接', 2000);
    };

    // 删除告知书
    window.deleteNotice = function(id) {
        if (confirm('确定要删除这份告知书吗？')) {
            notices = notices.filter(n => n.id !== id);
            localStorage.setItem('notices', JSON.stringify(notices));
            renderRecords();
        }
    };

    // 添加查看签名详情功能
    window.viewSignatures = function(id) {
        const notice = notices.find(n => n.id === id);
        if (notice && notice.signatures.length > 0) {
            const win = window.open('', '_blank', 'width=800,height=600');
            win.document.write(`
                <html>
                <head>
                    <title>签名记录 - ${notice.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .signature-item { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                        .signature-image { max-width: 500px; border: 1px solid #ddd; }
                        .signature-info { color: #666; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <h2>${notice.title} - 签名记录</h2>
                    ${notice.signatures.map(sig => `
                        <div class="signature-item">
                            <img src="${sig.signature}" class="signature-image" alt="签名">
                            <div class="signature-info">
                                签名时间：${new Date(sig.datetime).toLocaleString()}
                            </div>
                        </div>
                    `).join('')}
                </body>
                </html>
            `);
        }
    };

    // 初始化显示
    renderRecords();
}); 