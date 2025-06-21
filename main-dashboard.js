import { Database } from './db.js';
import { ncdsData } from './ncds-data.js';
import { exerciseData } from './exercise-data.js';
import { foodData } from './food-data.js';

document.addEventListener('DOMContentLoaded', () => {

    const db = new Database();
    let currentUser = null;
    let changeLogChart = null;

    function initApp() {
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = JSON.parse(userJson);
        
        initDashboard();
        initNavigation();
        initLogout();
    }

    // --- INITIALIZATION ---
    function initDashboard() {
        // Set user info
        document.getElementById('user-fullname').textContent = currentUser.fullName;
        document.getElementById('sidebar-username').textContent = currentUser.username;
        
        // Set date
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('th-TH', dateOptions);

        // Load panels' initial state
        renderNCDsPanel();
        initHealthForm();
        initBmiCalculator();
        initChangeLog();
        initProfilePicture();

        // Initially show dashboard panel
        showPanel('dashboard');
    }

    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Don't deactivate logout button
                if(item.id === 'logout-btn') return;
                
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const panelId = item.getAttribute('data-panel');
                showPanel(panelId);

                if (window.innerWidth <= 768) {
                    document.querySelector('.sidebar').classList.remove('open');
                }
            });
        });

        // Sidebar toggle for mobile
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const closeSidebarBtn = document.getElementById('close-sidebar-btn');
        const sidebar = document.querySelector('.sidebar');
        
        menuToggleBtn.addEventListener('click', () => sidebar.classList.add('open'));
        closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }

    function initProfilePicture() {
        const mainPic = document.getElementById('main-profile-pic');
        const sidebarPic = document.getElementById('sidebar-profile-pic');
        const uploader = document.getElementById('profile-pic-upload');

        const updatePics = (src) => {
            mainPic.src = src;
            sidebarPic.src = src;
        };

        if (currentUser.profilePic) {
            updatePics(currentUser.profilePic);
        }

        mainPic.addEventListener('click', () => uploader.click());

        uploader.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const newPicDataUrl = event.target.result;
                    updatePics(newPicDataUrl);
                    
                    // Update session and DB
                    currentUser.profilePic = newPicDataUrl;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    await db.updateUser(currentUser);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // --- PANEL LOGIC ---
    function showPanel(panelId) {
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.style.display = panel.id === panelId ? 'block' : 'none';
        });
    }

    function renderNCDsPanel() {
        const ncdsContent = document.getElementById('ncds-content');
        if (!ncdsContent) return;

        ncdsContent.innerHTML = ''; 
        ncdsData.forEach(ncd => {
            const ncdItem = document.createElement('div');
            ncdItem.className = 'ncd-item';

            const btn = document.createElement('button');
            btn.className = 'ncd-title';
            btn.innerHTML = `<span>${ncd.name}</span> <i class="fas fa-chevron-down"></i>`;
            
            const detail = document.createElement('div');
            detail.className = 'ncd-detail';

            detail.innerHTML = `
                <div class="ncd-section"><h4><i class="fas fa-info-circle"></i> ภาพรวมของโรค</h4><p>${ncd.definition}</p></div>
                <div class="ncd-section"><h4><i class="fas fa-user-md"></i> อาการที่พบบ่อย</h4><ul>${ncd.symptoms.map(s => `<li>${s}</li>`).join('')}</ul></div>
                <div class="ncd-section"><h4><i class="fas fa-search-plus"></i> สาเหตุและปัจจัยเสี่ยง</h4><ul>${ncd.causes.map(c => `<li>${c}</li>`).join('')}</ul></div>
                <div class="ncd-section"><h4><i class="fas fa-stethoscope"></i> การวินิจฉัย</h4><ul>${ncd.diagnosis.map(d => `<li>${d}</li>`).join('')}</ul></div>
                <div class="ncd-section"><h4><i class="fas fa-pills"></i> แนวทางการรักษา</h4><ul>${ncd.treatment.map(t => `<li>${t}</li>`).join('')}</ul></div>
                <div class="ncd-section"><h4><i class="fas fa-shield-alt"></i> การป้องกันและควบคุม</h4><ul>${ncd.prevention.map(p => `<li>${p}</li>`).join('')}</ul></div>
            `;

            btn.onclick = () => {
                const isActive = btn.classList.toggle('active');
                detail.style.maxHeight = isActive ? detail.scrollHeight + "px" : "0px";
                btn.querySelector('i').classList.toggle('fa-chevron-down');
                btn.querySelector('i').classList.toggle('fa-chevron-up');
            };

            ncdItem.appendChild(btn);
            ncdItem.appendChild(detail);
            ncdsContent.appendChild(ncdItem);
        });
    }

    async function initHealthForm() {
        const form = document.getElementById('user-health-form');
        const messageEl = document.getElementById('health-form-message');
        const fields = ['chronic-diseases', 'surgeries', 'allergies'];
        
        const healthInfo = await db.getHealthInfo(currentUser.username);
        if (healthInfo) {
            fields.forEach(fieldId => {
                document.getElementById(fieldId).value = healthInfo[fieldId] || '';
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dataToSave = { username: currentUser.username };
            fields.forEach(fieldId => {
                dataToSave[fieldId] = document.getElementById(fieldId).value;
            });
            await db.saveHealthInfo(dataToSave);
            messageEl.textContent = 'บันทึกข้อมูลสำเร็จ!';
            messageEl.className = 'message success';
            setTimeout(() => messageEl.textContent = '', 3000);
        });
    }

    async function initBmiCalculator() {
        const form = document.getElementById('bmi-form');
        const messageEl = document.getElementById('bmi-message');
        const resultSection = document.getElementById('bmi-result-section');
        const bmiValueEl = document.getElementById('bmi-value');
        const bmiAnalysisEl = document.getElementById('bmi-analysis');

        const lastRecord = await db.getLatestBmiRecord(currentUser.username);
        if (lastRecord) {
            loadRecommendations(lastRecord.bmi);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const today = new Date().toISOString().split('T')[0];
            const todayRecord = await db.getBmiRecordForDate(currentUser.username, today);
            if(todayRecord) {
                messageEl.textContent = 'คุณได้บันทึกค่า BMI สำหรับวันนี้ไปแล้ว';
                messageEl.className = 'message error';
                return;
            }

            const weight = parseFloat(document.getElementById('weight').value);
            const height = parseFloat(document.getElementById('height').value);
            if (isNaN(weight) || isNaN(height) || height <= 0 || weight <= 0) {
                 messageEl.textContent = 'กรุณาใส่ค่าที่ถูกต้อง';
                 messageEl.className = 'message error';
                 return;
            }
            
            const heightInMeters = height / 100;
            const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
            const analysis = getBmiAnalysis(parseFloat(bmi));

            const record = {
                username: currentUser.username,
                date: today,
                bmi: parseFloat(bmi),
                weight,
                height
            };
            await db.addBmiRecord(record);
            
            messageEl.textContent = 'บันทึกค่า BMI สำเร็จ!';
            messageEl.className = 'message success';
            
            resultSection.style.display = 'block';
            bmiValueEl.textContent = `ค่า BMI ของคุณ: ${bmi}`;
            bmiAnalysisEl.textContent = `ผลการวิเคราะห์: ${analysis.status} - ${analysis.risks}`;
            
            loadRecommendations(parseFloat(bmi));
            form.reset();
        });
    }

    function getBmiAnalysis(bmi) {
        if (bmi < 18.5) return { status: 'น้ำหนักน้อย', risks: 'เสี่ยงต่อภาวะขาดสารอาหาร' };
        if (bmi < 23) return { status: 'น้ำหนักปกติ', risks: 'สุขภาพดี' };
        if (bmi < 25) return { status: 'น้ำหนักเกิน', risks: 'เริ่มมีความเสี่ยงต่อโรคอ้วนและเบาหวาน' };
        if (bmi < 30) return { status: 'โรคอ้วนระดับ 1', risks: 'เสี่ยงต่อโรคเบาหวาน, ความดันสูง' };
        return { status: 'โรคอ้วนระดับ 2', risks: 'เสี่ยงต่อโรคหัวใจ, ไขมันในเลือดสูง และโรค NCDs รุนแรง' };
    }

    function loadRecommendations(bmi) {
        const exerciseContent = document.getElementById('exercise-content');
        const foodContent = document.getElementById('food-content');
        
        let category = 'healthy';
        if (bmi < 18.5) category = 'underweight';
        else if (bmi >= 23) category = 'overweight';

        const exercises = exerciseData[category];
        exerciseContent.innerHTML = `<h3>สำหรับ BMI ${bmi} (กลุ่ม: ${exercises.label})</h3><ul>${exercises.recommendations.map(r => `<li><strong>${r.type}:</strong> ${r.description}</li>`).join('')}</ul>`;

        const foods = foodData[category];
        foodContent.innerHTML = `<h3>สำหรับ BMI ${bmi} (กลุ่ม: ${foods.label})</h3><p>${foods.principle}</p><div class="food-plan">${foods.plan.map(day => `
            <div class="day-card">
                <h4>${day.day}</h4>
                <p><strong>เช้า:</strong> ${day.meals.breakfast}</p>
                <p><strong>กลางวัน:</strong> ${day.meals.lunch}</p>
                <p><strong>เย็น:</strong> ${day.meals.dinner}</p>
            </div>
        `).join('')}</div>`;
    }

    async function initChangeLog() {
        const form = document.getElementById('log-entry-form');
        const exportBtn = document.getElementById('export-excel-btn');
        const ctx = document.getElementById('change-log-chart').getContext('2d');

        const records = await db.getAllChangeLogRecords(currentUser.username);
        if (records && records.length > 0) {
            renderChart(ctx, records);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const weight = parseFloat(document.getElementById('log-weight').value);
            const waist = parseFloat(document.getElementById('log-waist').value);
            const chest = parseFloat(document.getElementById('log-chest').value);
            
            if (isNaN(weight) && isNaN(waist) && isNaN(chest)) {
                alert('กรุณากรอกค่าอย่างน้อย 1 อย่าง');
                return;
            }

            const newRecord = {
                username: currentUser.username,
                date: new Date().toISOString().split('T')[0],
                weight: !isNaN(weight) ? weight : null,
                waist: !isNaN(waist) ? waist : null,
                chest: !isNaN(chest) ? chest : null,
            };

            await db.addChangeLogRecord(newRecord);
            const updatedRecords = await db.getAllChangeLogRecords(currentUser.username);
            renderChart(ctx, updatedRecords);
            form.reset();
        });

        exportBtn.addEventListener('click', async () => {
            const recordsToExport = await db.getAllChangeLogRecords(currentUser.username);
            if(recordsToExport.length === 0) {
                alert('ไม่มีข้อมูลสำหรับส่งออก');
                return;
            }
            const worksheet = XLSX.utils.json_to_sheet(recordsToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ChangeLog");
            XLSX.writeFile(workbook, "ChangeLogData.xlsx");
        });
    }

    function renderChart(ctx, records) {
        if (changeLogChart) {
            changeLogChart.destroy();
        }
        
        const labels = records.map(r => new Date(r.date).toLocaleDateString('th-TH'));
        const weightData = records.map(r => r.weight);
        const waistData = records.map(r => r.waist);
        const chestData = records.map(r => r.chest);

        changeLogChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'น้ำหนัก (กก.)',
                        data: weightData,
                        borderColor: '#277da1',
                        backgroundColor: '#277da120',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'รอบเอว (ซม.)',
                        data: waistData,
                        borderColor: '#f9844a',
                        backgroundColor: '#f9844a20',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'รอบอก (ซม.)',
                        data: chestData,
                        borderColor: '#90be6d',
                        backgroundColor: '#90be6d20',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    }
    
    // --- START THE APP ---
    initApp();
}); 