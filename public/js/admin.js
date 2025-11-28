    let menuToggleBtnAdmin;
    let navLinksAdmin;
    let selectedFileAdmin = null;

    document.addEventListener('DOMContentLoaded', () => {
        console.log('Admin DOM yuklandi.');
        checkLoginState();

        menuToggleBtnAdmin = document.getElementById('menu-toggle-btn-admin');
        navLinksAdmin = document.querySelector('#main-header.admin-header .nav-links');

        if (menuToggleBtnAdmin && navLinksAdmin) {
            console.log('Admin mobil menyu tugmasi va linklari topildi.');
            menuToggleBtnAdmin.addEventListener('click', () => {
                navLinksAdmin.classList.toggle('active');
                const icon = menuToggleBtnAdmin.querySelector('i');
                if (navLinksAdmin.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        } else {
            console.warn('Admin mobil menyu tugmasi yoki linklari topilmadi.');
        }


        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            setInterval(loadAdminChatMessages, 7000);
        }

        const currentYearSpanAdmin = document.getElementById('currentYearAdmin');
        if (currentYearSpanAdmin) {
            currentYearSpanAdmin.textContent = new Date().getFullYear();
        }
    });


    function checkLoginState() {
        console.log('Admin login holati tekshirilmoqda.');
        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            showAdminPanel();
        } else {
            showAdminLoginPage();
        }
    }

    function showAdminLoginPage() {
        console.log('Admin login sahifasi ko\'rsatilmoqda.');
        document.getElementById('admin-login-page').classList.remove('hidden');
        document.getElementById('admin-login-page').classList.add('active');
        document.getElementById('admin-panel-page').classList.add('hidden');
        document.getElementById('admin-panel-page').classList.remove('active');
        document.getElementById('logoutButton').classList.add('hidden');
    }

    function showAdminPanel() {
        console.log('Admin paneli ko\'rsatilmoqda.');
        document.getElementById('admin-login-page').classList.add('hidden');
        document.getElementById('admin-login-page').classList.remove('active');
        document.getElementById('admin-panel-page').classList.remove('hidden');
        document.getElementById('admin-panel-page').classList.add('active');
        document.getElementById('logoutButton').classList.remove('hidden');
        loadAdminPanelData();
    }

    async function handleAdminLogin() {
        console.log('Admin login urinishi...');
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const loginErrorP = document.getElementById('loginError');
        loginErrorP.textContent = '';

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                console.log('Admin muvaffaqiyatli kirdi.');
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                showAdminPanel();
                setInterval(loadAdminChatMessages, 7000);
            } else {
                console.warn('Admin login xatosi:', result.message);
                loginErrorP.textContent = result.message || 'Login yoki parol xato.';
                sessionStorage.removeItem('isAdminLoggedIn');
            }
        } catch (error) {
            console.error('Admin login API xatoligi:', error);
            loginErrorP.textContent = 'Login paytida xatolik: Server bilan bog\'lanib bo\'lmadi.';
            sessionStorage.removeItem('isAdminLoggedIn');
        }
    }

    function adminLogout() {
        console.log('Admin tizimdan chiqmoqda.');
        sessionStorage.removeItem('isAdminLoggedIn');
        showAdminLoginPage();
        alert('Tizimdan chiqdingiz.');
    }

    function loadAdminPanelData() {
        if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') return;
        console.log('Admin paneli ma\'lumotlari yuklanmoqda...');
        loadAdminChatMessages();
        loadCurrentWorkingHoursForAdmin();
        setTimeout(() => {
            const chatContainer = document.getElementById('adminChatMessages');
            if(chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 200);
    }

    async function addServiceAdmin() {
        console.log('Yangi xizmat qo\'shish urinishi...');
        const name = document.getElementById('serviceName').value.trim();
        const description = document.getElementById('serviceDescription').value.trim();
        const priceText = document.getElementById('servicePrice').value;
        const price = parseInt(priceText);

        if (!name || !description || !priceText || isNaN(price) || price <= 0) {
            alert('Barcha maydonlarni to\'g\'ri to\'ldiring! Narx musbat son bo\'lishi kerak.');
            return;
        }
        console.log('Xizmat ma\'lumotlari:', {name, description, price});

        try {
            const response = await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, price })
            });
            if (response.ok) {
                alert('Yangi xizmat muvaffaqiyatli qo\'shildi!');
                document.getElementById('serviceName').value = '';
                document.getElementById('serviceDescription').value = '';
                document.getElementById('servicePrice').value = '';
            } else {
                const errorData = await response.json().catch(()=>({message: "Serverdan noma'lum xatolik"}));
                console.error('Xizmat qo\'shishda server xatoligi:', errorData);
                alert(`Xizmat qo'shishda xatolik: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Xizmat qo\'shishda API xatoligi:', error);
            alert('Xizmat qo\'shishda server xatoligi.');
        }
    }

    async function updateWorkingHoursAdmin() {
        console.log('Ish vaqtini yangilash urinishi...');
        const days = document.getElementById('workDays').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        if (!days || !startTime || !endTime) {
            alert('Ish vaqti uchun barcha maydonlarni to\'ldiring!');
            return;
        }
        console.log('Yangi ish vaqti:', {days, startTime, endTime});

        try {
            const response = await fetch('/api/settings/working-hours', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days, startTime, endTime })
            });
            if (response.ok) {
                alert('Ish vaqti muvaffaqiyatli yangilandi!');
                loadCurrentWorkingHoursForAdmin();
            } else {
                const errorData = await response.json().catch(()=>({message: "Serverdan noma'lum xatolik"}));
                console.error('Ish vaqtini yangilashda server xatoligi:', errorData);
                alert(`Ish vaqtini yangilashda xatolik: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Ish vaqtini yangilashda API xatoligi:', error);
            alert('Ish vaqtini yangilashda server xatoligi.');
        }
    }

    async function loadCurrentWorkingHoursForAdmin() {
        console.log('Admin uchun joriy ish vaqti yuklanmoqda...');
        try {
            const response = await fetch('/api/settings/working-hours');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const wh = await response.json();
            console.log('Olingan ish vaqti:', wh);

            const display = document.getElementById('currentWorkingHoursAdmin');
            const daysSelect = document.getElementById('workDays');
            const startTimeInput = document.getElementById('startTime');
            const endTimeInput = document.getElementById('endTime');

            if (!display || !daysSelect || !startTimeInput || !endTimeInput) {
                console.error('Ish vaqti uchun DOM elementlari topilmadi.');
                return;
            }

            const daysText = {
                'dush-juma': 'Dushanba - Juma',
                'dush-shan': 'Dushanba - Shanba',
                'har-kun': 'Har kuni'
            };
            display.textContent = `${daysText[wh.days] || wh.days || 'Noma\'lum'}: ${wh.startTime || '--:--'} - ${wh.endTime || '--:--'}`;

            if(wh.days) daysSelect.value = wh.days;
            if(wh.startTime) startTimeInput.value = wh.startTime;
            if(wh.endTime) endTimeInput.value = wh.endTime;

        } catch (error) {
            console.error('Admin uchun ish vaqtini yuklashda xatolik:', error);
            const display = document.getElementById('currentWorkingHoursAdmin');
            if (display) display.textContent = 'Ish vaqtini yuklashda xatolik.';
        }
    }

    function previewImage(userTypeSuffix) {
        console.log(`[previewImage AdminJS] chaqirildi: ${userTypeSuffix} uchun`);
        const fileInput = document.getElementById(`imageInput${userTypeSuffix}`);
        const previewContainer = document.getElementById(`imagePreviewContainer${userTypeSuffix}`);

        if (!fileInput || !previewContainer) {
            console.error(`[previewImage AdminJS] Elementlar topilmadi: imageInput${userTypeSuffix} yoki imagePreviewContainer${userTypeSuffix}`);
            return;
        }

        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            console.log(`[previewImage AdminJS] Fayl tanlandi: ${file.name}`);

            if (!file.type.startsWith('image/')) {
                alert('Faqat rasm fayllarini yuklashingiz mumkin (masalan, PNG, JPG, GIF).');
                fileInput.value = '';
                clearImagePreview(userTypeSuffix);
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Rasm hajmi 5MB dan katta boʻlmasligi kerak.');
                fileInput.value = '';
                clearImagePreview(userTypeSuffix);
                return;
            }

            if (userTypeSuffix === 'Admin') selectedFileAdmin = file;
            else if (typeof selectedFileUser !== 'undefined' && userTypeSuffix === 'User') selectedFileUser = file;


            const reader = new FileReader();
            reader.onload = function(e) {
                previewContainer.innerHTML = `
                    <img src="${e.target.result}" alt="Tanlangan rasm">
                    <span>${file.name.length > 20 ? file.name.substring(0,17)+'...' : file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                    <button class="remove-preview-btn" onclick="clearImagePreview('${userTypeSuffix}')" title="Rasmni olib tashlash">X</button>
                `;
                previewContainer.classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        } else {
            clearImagePreview(userTypeSuffix);
        }
    }

    function clearImagePreview(userTypeSuffix) {
        console.log(`[clearImagePreview AdminJS] chaqirildi: ${userTypeSuffix} uchun`);
        const fileInput = document.getElementById(`imageInput${userTypeSuffix}`);
        const previewContainer = document.getElementById(`imagePreviewContainer${userTypeSuffix}`);

        if(fileInput) fileInput.value = '';

        if (userTypeSuffix === 'Admin') selectedFileAdmin = null;
        else if (typeof selectedFileUser !== 'undefined' && userTypeSuffix === 'User') selectedFileUser = null;


        if(previewContainer) {
            previewContainer.classList.add('hidden');
            previewContainer.innerHTML = '';
        }
    }


    async function loadAdminChatMessages() {
        if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') return;
        try {
            const response = await fetch('/api/chat/messages');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const messages = await response.json();

            const container = document.getElementById('adminChatMessages');
            if (!container) {
                return;
            }

            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 10;
            container.innerHTML = '';

            if (!messages || messages.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center;">Hozircha xabarlar yo\'q</p>';
            } else {
                messages.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.user}`;
                    messageDiv.style.backgroundColor = msg.user === 'user' ? '#e3f2fd' : '#f1f8e9';
                    messageDiv.style.border = `1px solid ${msg.user === 'user' ? '#bbdefb' : '#dcedc8'}`;

                    let messageContent = `<span class="sender">${msg.user === 'user' ? 'Foydalanuvchi' : 'Siz (Admin)'}</span>`;
                    if (msg.text) {
                        const linkedText = msg.text.replace(/(https?:\/\/[^\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
                        messageContent += `<div class="message-text" style="margin-bottom: ${msg.imageUrl ? '5px' : '0'}; white-space: pre-wrap;">${linkedText}</div>`;
                    }
                    if (msg.imageUrl) {
                        messageContent += `<img src="${msg.imageUrl}" alt="Chatdagi rasm" class="chat-image" onclick="openImageModal('${msg.imageUrl}')">`;
                    }
                    const displayTimestamp = msg.timestamp || new Date(msg.id).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute: '2-digit'});
                    messageContent += `<span class="timestamp">${displayTimestamp}</span>`;

                    messageDiv.innerHTML = messageContent;
                    container.appendChild(messageDiv);
                });
            }

            if (isScrolledToBottom || messages.length < 5) {
                container.scrollTop = container.scrollHeight;
            }

        } catch (error) {
        }
    }

    async function sendAdminReply() {
        console.log('Admin javob yuborish urinishi...');
        const textInput = document.getElementById('adminReplyInput');
        const text = textInput.value.trim();

        if (!text && !selectedFileAdmin) {
            console.log('Admin javobi uchun matn yoki rasm yo\'q.');
            return;
        }

        const formData = new FormData();
        formData.append('user', 'admin');
        if (text) formData.append('text', text);
        if (selectedFileAdmin) formData.append('chatImage', selectedFileAdmin);
        console.log('Admin javobi uchun FormData:', {text_sent: !!text, image_sent: !!selectedFileAdmin});

        try {
            textInput.disabled = true;
            const sendButton = document.querySelector('.admin-chat-input .btn-send');
            if(sendButton) sendButton.disabled = true;

            const response = await fetch('/api/chat/messages', { method: 'POST', body: formData });

            textInput.disabled = false;
            if(sendButton) sendButton.disabled = false;

            if (response.ok) {
                textInput.value = '';
                clearImagePreview('Admin');
                await loadAdminChatMessages();
                const chatContainer = document.getElementById('adminChatMessages');
                if(chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                const errorResult = await response.json().catch(() => ({ message: "Serverdan noma'lum xatolik" }));
                console.error('Admin javobini yuborishda xatolik:', errorResult);
                alert(`Javob yuborishda xatolik: ${errorResult.message}`);
            }
        } catch (error) {
            console.error('Admin javobini yuborishda API xatoligi:', error);
            alert('Javob yuborishda server bilan bog\'lanishda xatolik.');
            textInput.disabled = false;
            const sendButton = document.querySelector('.admin-chat-input .btn-send');
            if(sendButton) sendButton.disabled = false;
        }
    }

    function openImageModal(imageUrl) {
        console.log('[openImageModal AdminJS] chaqirildi, URL:', imageUrl);
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '2000';
        modal.onclick = () => {
            document.body.removeChild(modal);
        };
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.border = '3px solid white';
        img.style.borderRadius = '5px';
        img.style.boxShadow = '0 0 25px rgba(0,0,0,0.5)';
        modal.appendChild(img);
        document.body.appendChild(modal);
    }