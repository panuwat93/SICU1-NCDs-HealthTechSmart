import { Database } from './db.js';
import { ncdsData } from './ncds-data.js';
import { exerciseData } from './exercise-data.js';
import { foodData } from './food-data.js';

// User Authentication & Data Initialization
const user = JSON.parse(localStorage.getItem('sicu1_user'));
if (!user) {
  window.location.href = 'index.html';
}

const greetingEl = document.getElementById('greeting');
const dateEl = document.getElementById('currentDate');
const profilePicEl = document.getElementById('profilePic');

greetingEl.textContent = `สวัสดี, ${user.fullname}`;
dateEl.textContent = new Date().toLocaleDateString('th-TH', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
});

// IndexedDB setup
const DB_NAME = 'SICU1NCDsDB';
const DB_VERSION = 4;
const USER_STORE = 'users';
const HEALTH_STORE = 'health_info';
const BMI_STORE = 'bmi_records';
const CHANGE_LOG_STORE = 'change_log';
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains(USER_STORE)) {
        dbInstance.createObjectStore(USER_STORE, { keyPath: 'username' });
      }
      if (!dbInstance.objectStoreNames.contains(HEALTH_STORE)) {
        dbInstance.createObjectStore(HEALTH_STORE, { keyPath: 'username' });
      }
      if (!dbInstance.objectStoreNames.contains(BMI_STORE)) {
        const bmiStore = dbInstance.createObjectStore(BMI_STORE, { autoIncrement: true });
        bmiStore.createIndex('by_user_date', ['username', 'date']);
      }
      if (!dbInstance.objectStoreNames.contains(CHANGE_LOG_STORE)) {
        const logStore = dbInstance.createObjectStore(CHANGE_LOG_STORE, { autoIncrement: true });
        logStore.createIndex('by_user_date', ['username', 'date']);
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

// Generic DB access functions
function getStore(storeName, mode) {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}
function getData(storeName, key) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readonly').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function putData(storeName, data) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readwrite').put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function addData(storeName, data) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readwrite').add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Sidebar Navigation
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const mainContent = document.getElementById('mainContent');
const menuItems = document.querySelectorAll('.sidebar .menu li');
const menuPanels = document.querySelectorAll('.menu-panel');

openSidebarBtn.onclick = () => sidebar.classList.add('open');
closeSidebarBtn.onclick = () => sidebar.classList.remove('open');

menuItems.forEach(item => {
  item.onclick = () => {
    sidebar.classList.remove('open');
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const menuId = item.dataset.menu;
    menuPanels.forEach(panel => {
      panel.style.display = panel.id === menuId ? 'block' : 'none';
    });
  };
});

// Profile Picture Management
profilePicEl.src = user.profile || 'assets/profile-default.png';
profilePicEl.onclick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const newProfilePic = reader.result;
      profilePicEl.src = newProfilePic;
      user.profile = newProfilePic;
      localStorage.setItem('sicu1_user', JSON.stringify(user));
      await putData(USER_STORE, user);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// NCDs Panel Logic
function renderNCDsPanel() {
    const ncdsContent = document.getElementById('ncds-content');
    if (!ncdsContent) return;

    ncdsContent.innerHTML = ''; 
    ncdsData.forEach(ncd => {
        const ncdItem = document.createElement('div');
        ncdItem.className = 'ncd-item';

        const btn = document.createElement('button');
        btn.className = 'ncd-title';
        btn.textContent = ncd.name;

        const detail = document.createElement('div');
        detail.className = 'ncd-detail';

        detail.innerHTML = `
            <div class="ncd-section">
                <h4><i class="fas fa-info-circle"></i> ภาพรวมของโรค</h4>
                <p>${ncd.definition}</p>
            </div>
            <div class="ncd-section">
                <h4><i class="fas fa-user-md"></i> อาการที่พบบ่อย</h4>
                <ul>${ncd.symptoms.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            <div class="ncd-section">
                <h4><i class="fas fa-search-plus"></i> สาเหตุและปัจจัยเสี่ยง</h4>
                <ul>${ncd.causes.map(c => `<li>${c}</li>`).join('')}</ul>
            </div>
            <div class="ncd-section">
                <h4><i class="fas fa-stethoscope"></i> การวินิจฉัย</h4>
                <ul>${ncd.diagnosis.map(d => `<li>${d}</li>`).join('')}</ul>
            </div>
            <div class="ncd-section">
                <h4><i class="fas fa-pills"></i> แนวทางการรักษา</h4>
                <ul>${ncd.treatment.map(t => `<li>${t}</li>`).join('')}</ul>
            </div>
            <div class="ncd-section">
                <h4><i class="fas fa-shield-alt"></i> การป้องกันและควบคุม</h4>
                <ul>${ncd.prevention.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
        `;

        btn.onclick = () => {
            const isActive = btn.classList.toggle('active');
            detail.style.display = isActive ? 'block' : 'none';
        };

        ncdItem.appendChild(btn);
        ncdItem.appendChild(detail);
        ncdsContent.appendChild(ncdItem);
    });
}

// Health Info Panel Logic
const healthDisplay = document.getElementById('health-display');
const healthForm = document.getElementById('health-form');
const editHealthBtn = document.getElementById('edit-health-btn');
const cancelHealthBtn = document.getElementById('cancel-health-btn');

async function loadHealthInfo() {
  const info = await getData(HEALTH_STORE, user.username);
  if (info) {
    document.getElementById('display-disease').textContent = info.disease || '-';
    document.getElementById('display-surgery').textContent = info.surgery || '-';
    document.getElementById('display-drug-allergy').textContent = info.drugAllergy || '-';
    document.getElementById('display-food-allergy').textContent = info.foodAllergy || '-';

    document.getElementById('disease').value = info.disease || '';
    document.getElementById('surgery').value = info.surgery || '';
    document.getElementById('drug-allergy').value = info.drugAllergy || '';
    document.getElementById('food-allergy').value = info.foodAllergy || '';
  }
}
editHealthBtn.onclick = () => {
  healthDisplay.style.display = 'none';
  healthForm.style.display = 'block';
};
cancelHealthBtn.onclick = () => {
  healthDisplay.style.display = 'block';
  healthForm.style.display = 'none';
};
healthForm.onsubmit = async (e) => {
  e.preventDefault();
  const healthData = {
    username: user.username,
    disease: document.getElementById('disease').value.trim(),
    surgery: document.getElementById('surgery').value.trim(),
    drugAllergy: document.getElementById('drug-allergy').value.trim(),
    foodAllergy: document.getElementById('food-allergy').value.trim(),
  };
  await putData(HEALTH_STORE, healthData);
  await loadHealthInfo();
  cancelHealthBtn.click();
};

// BMI Panel Logic
const bmiForm = document.getElementById('bmi-form');
const bmiResultEl = document.getElementById('bmi-result');
const bmiMessageEl = document.getElementById('bmi-message');
let lastBmiRecord = null;

function getBmiCategory(bmi) {
    if (bmi < 18.5) return 'น้ำหนักน้อย / ผอม';
    if (bmi >= 18.5 && bmi <= 22.9) return 'ปกติ (สุขภาพดี)';
    if (bmi >= 23 && bmi <= 24.9) return 'ท้วม / โรคอ้วนระดับ 1';
    if (bmi >= 25 && bmi <= 29.9) return 'อ้วน / โรคอ้วนระดับ 2';
    return 'อ้วนมาก / โรคอ้วนระดับ 3';
}

function getBmiRisks(category) {
    const risks = {
        'น้ำหนักน้อย / ผอม': ['ภาวะขาดสารอาหาร', 'อ่อนเพลีย'],
        'ปกติ (สุขภาพดี)': ['มีความเสี่ยงต่อโรคต่างๆ น้อยที่สุด'],
        'ท้วม / โรคอ้วนระดับ 1': ['ความดันโลหิตสูง', 'เบาหวานชนิดที่ 2'],
        'อ้วน / โรคอ้วนระดับ 2': ['โรคหัวใจและหลอดเลือด', 'ไขมันในเลือดสูง'],
        'อ้วนมาก / โรคอ้วนระดับ 3': ['เสี่ยงต่อโรค NCDs รุนแรง', 'ปัญหาการหายใจ', 'โรคข้อเสื่อม']
    };
    const riskItems = risks[category] || [];
    return `<ul>${riskItems.map(r => `<li>${r}</li>`).join('')}</ul>`;
}
function displayBmiResult(bmiRecord) {
  const category = getBmiCategory(bmiRecord.bmi);
  const risksHtml = getBmiRisks(category);
  bmiResultEl.innerHTML = `
    <div class="bmi-value">${bmiRecord.bmi.toFixed(2)}</div>
    <div class="bmi-category" style="color:${category === 'ปกติ (สุขภาพดี)' ? 'green' : 'red'};">${category}</div>
    <div class="bmi-risks"><strong>ความเสี่ยงต่อโรค:</strong>${risksHtml}</div>
  `;
}
async function loadLastBmi() {
  const store = getStore(BMI_STORE, 'readonly');
  const index = store.index('by_user_date');
  // Set the range to get all records for the current user
  const range = IDBKeyRange.bound([user.username, ''], [user.username, new Date().toISOString()]);
  
  return new Promise((resolve, reject) => {
    // Open a cursor to iterate backwards
    const req = index.openCursor(range, 'prev');
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        lastBmiRecord = cursor.value;
        displayBmiResult(lastBmiRecord);
        loadExerciseRec(lastBmiRecord);
        loadFoodRec(lastBmiRecord);
        resolve(cursor.value);
      } else {
        // No record found
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
bmiForm.onsubmit = async (e) => {
  e.preventDefault();
  const today = new Date().toISOString().split('T')[0];
  if (lastBmiRecord && lastBmiRecord.date === today) {
    bmiMessageEl.textContent = 'คุณสามารถบันทึก BMI ได้วันละ 1 ครั้งเท่านั้น';
    return;
  }
  const height = parseFloat(document.getElementById('height').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const bmi = weight / ((height / 100) ** 2);
  
  const bmiRecord = {
    username: user.username,
    date: today,
    height,
    weight,
    bmi
  };
  await addData(BMI_STORE, bmiRecord);
  lastBmiRecord = bmiRecord; // Update last record
  displayBmiResult(bmiRecord);
  loadExerciseRec(bmiRecord); // Update recommendations
  loadFoodRec(bmiRecord);
  bmiMessageEl.textContent = '';
};

// Exercise & Food Recommendation Panels
function getRecommendationCategory(bmi) {
    if (bmi < 18.5) return 'underweight';
    if (bmi >= 18.5 && bmi <= 24.9) return 'normal';
    if (bmi > 24.9) return 'overweight';
    return 'normal'; // Default
}
function loadExerciseRec(bmiRecord) {
  const contentEl = document.getElementById('exercise-content');
  if (!bmiRecord) {
    contentEl.innerHTML = '<p>กรุณาบันทึกข้อมูล BMI ก่อน เพื่อรับคำแนะนำที่เหมาะสม</p>';
    return;
  }
  const category = getRecommendationCategory(bmiRecord.bmi);
  const rec = exerciseData[category];
  
  contentEl.innerHTML = `
    <p class="rec-title">คำแนะนำสำหรับผู้ที่: <strong>${rec.title}</strong></p>
    <p class="rec-description">${rec.description}</p>
    ${rec.routines.map(r => `
      <div class="exercise-card">
        <h3>${r.day}</h3>
        <p>${r.plan}</p>
      </div>
    `).join('')}
  `;
}
function loadFoodRec(bmiRecord) {
  const contentEl = document.getElementById('food-content');
  if (!bmiRecord) {
    contentEl.innerHTML = '<p>กรุณาบันทึกข้อมูล BMI ก่อน เพื่อรับคำแนะนำที่เหมาะสม</p>';
    return;
  }
  const category = getRecommendationCategory(bmiRecord.bmi);
  const rec = foodData[category];
  
  contentEl.innerHTML = `
    <p class="rec-title">ตัวอย่างแผนอาหาร 7 วันสำหรับ: <strong>${rec.title}</strong></p>
    <p class="rec-description">${rec.description}</p>
    <table class="food-table">
      <tr><th>วัน</th><th>เช้า</th><th>กลางวัน</th><th>เย็น</th></tr>
      ${rec.plan.map(d => `
        <tr>
          <td><strong>${d.day}</strong></td>
          <td>${d.meals.breakfast}</td>
          <td>${d.meals.lunch}</td>
          <td>${d.meals.dinner}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

// Change Log Panel Logic
const logForm = document.getElementById('change-log-form');
const monthSelect = document.getElementById('month-select');
const exportBtn = document.getElementById('export-excel-btn');
const logDateInput = document.getElementById('log-date');
let chart;

logDateInput.value = new Date().toISOString().split('T')[0];

async function getLogData(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).getDate();
  const endRange = `${year}-${String(month).padStart(2, '0')}-${endDate}`;
  
  const store = getStore(CHANGE_LOG_STORE, 'readonly');
  const index = store.index('by_user_date');
  const range = IDBKeyRange.bound([user.username, startDate], [user.username, endRange]);

  return new Promise((resolve, reject) => {
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function updateChart(data) {
  const ctx = document.getElementById('change-chart').getContext('2d');
  const labels = data.map(d => new Date(d.date).getDate());
  
  if (chart) chart.destroy();
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'น้ำหนัก (กก.)', data: data.map(d => d.weight), borderColor: '#17628c', fill: false, yAxisID: 'y' },
        { label: 'รอบอก (ซม.)', data: data.map(d => d.chest), borderColor: '#ff6384', fill: false, yAxisID: 'y1' },
        { label: 'รอบเอว (ซม.)', data: data.map(d => d.waist), borderColor: '#36a2eb', fill: false, yAxisID: 'y1' },
      ]
    },
    options: {
      scales: {
        y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'น้ำหนัก (กก.)' } },
        y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'ขนาด (ซม.)' }, grid: { drawOnChartArea: false } }
      }
    }
  });
}

async function renderChangeLog() {
  const [year, month] = monthSelect.value.split('-').map(Number);
  const data = await getLogData(year, month);
  updateChart(data);
}

function populateMonthSelect() {
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    for (let i = 0; i < 12; i++) {
        const month = currentMonth - i;
        const year = currentYear;
        if (month <= 0) {
            // Adjust for previous year
            month += 12;
            year -= 1;
        }
        const option = document.createElement('option');
        option.value = `${year}-${month}`;
        option.textContent = `${months[month-1]} ${year + 543}`;
        monthSelect.appendChild(option);
    }
}

logForm.onsubmit = async (e) => {
  e.preventDefault();
  const logData = {
    username: user.username,
    date: logDateInput.value,
    weight: parseFloat(document.getElementById('log-weight').value),
    chest: parseFloat(document.getElementById('log-chest').value),
    waist: parseFloat(document.getElementById('log-waist').value)
  };
  await addData(CHANGE_LOG_STORE, logData);
  logForm.reset();
  logDateInput.value = new Date().toISOString().split('T')[0];
  await renderChangeLog();
};

monthSelect.onchange = renderChangeLog;

exportBtn.onclick = async () => {
  const [year, month] = monthSelect.value.split('-').map(Number);
  const data = await getLogData(year, month);
  if (data.length === 0) {
    alert('ไม่มีข้อมูลสำหรับเดือนที่เลือก');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data.map(d => ({
    'วันที่': d.date,
    'น้ำหนัก (กก.)': d.weight,
    'รอบอก (ซม.)': d.chest,
    'รอบเอว (ซม.)': d.waist
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Change Log');
  XLSX.writeFile(workbook, `ChangeLog_${year}_${month}.xlsx`);
};

// Logout functionality
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

// Initialize everything on dashboard
function initDashboard() {
  initLogout(); // Call the logout setup
  (async () => {
    await openDB();
    renderNCDsPanel();
    await loadHealthInfo();
    await loadLastBmi();
    populateMonthSelect();
    await renderChangeLog();
  })();
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
}); 