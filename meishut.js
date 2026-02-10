const SUPABASE_URL = 'https://kusupazutodidrwqnmrz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1c3VwYXp1dG9kaWRyd3FubXJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY2NTE1MywiZXhwIjoyMDc2MjQxMTUzfQ.1A7FecUTqWJ0FhuMF5TFGz6aTn3-l1pBTXLAq1bxey4';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Hàm lấy dữ liệu từ bảng OEE_Data
async function fetchOEEData() {
    try {
        // Sử dụng dấu nháy kép cho các cột có ký tự đặc biệt (%) và dấu cách
        const { data, error } = await supabaseClient
            .from('OEE_Data')
            .select('Timestamp, "A (%)", "P (%)", "Q (%)"') 
            .order('Timestamp', { ascending: true })
            .limit(20);

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Lỗi khi lấy dữ liệu Supabase:", err.message);
        return [];
    }
}

async function updateMainChartFromSupabase() {
    const rawData = await fetchOEEData();
    if (rawData.length === 0) return;

    const timestamps = rawData.map(item => {
        const date = new Date(item.Timestamp);
        return `${date.getHours()}:${date.getMinutes()}`;
    });

    // Truy xuất thuộc tính bằng tên chính xác (bao gồm cả dấu cách và %)
    const dataA = rawData.map(item => item["A (%)"]);
    const dataP = rawData.map(item => item["P (%)"]);
    const dataQ = rawData.map(item => item["Q (%)"]);

    if (mainChart) {
        mainChart.updateOptions({
            xaxis: { categories: timestamps },
            series: [
                { name: 'Availability', type: 'column', data: dataA },
                { name: 'Quality', type: 'column', data: dataQ },
                { name: 'Performance', type: 'line', data: dataP }
            ]
        });
    }
}


function switchPage(targetId) {
    const navLinks = document.querySelectorAll('.nav-link');
    const pageContents = document.querySelectorAll('.page-content');

    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === targetId) {
            link.classList.add('active', 'bg-slate-700');
        } else {
            link.classList.remove('active', 'bg-slate-700');
        }
    });

    pageContents.forEach(content => {
        if (content.id === targetId) {
            content.classList.remove('hidden');
            // Fix lỗi biểu đồ khi ẩn hiện
            if (targetId === 'sensor-db-content' && charts.oee) {
                setTimeout(() => {
                    Object.values(charts).forEach(c => c.updateOptions({}, true, true));
                }, 100);
            }
        } else {
            content.classList.add('hidden');
        }
    });
}

// =========================================
// 2. KHỞI TẠO KHI TRANG TẢI XONG
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    // Gắn sự kiện cho các nút Menu
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(link.getAttribute('data-target'));
            if (window.innerWidth < 768) {
                document.querySelector('aside')?.classList.add('hidden');
            }
        });
    });

    // Nút Menu Mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.querySelector('aside')?.classList.toggle('hidden');
        });
    }

    // Nút Upload & Browser (Sửa lỗi dòng 45 trong ảnh)
    const browseBtn = document.getElementById('browse-btn');
    const fileInput = document.getElementById('file-input');
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', () => fileInput.click());
    }

    // Khởi tạo Chart và MQTT
    initSensorCharts();
    
    // Mặc định vào trang Dashboard
    switchPage('dashboard-content');
});


// =========================================
// 3. CHATBOT & RAG LOGIC (CÓ KIỂM TRA LỖI KẾT NỐI)
// =========================================
const fileDropZone = document.getElementById('file-drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const startTrainBtn = document.getElementById('start-train-btn');

// Xử lý chọn file
if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
    fileInput.addEventListener('change', handleFiles);
}

// Xử lý Drag & Drop
if (fileDropZone) {
    fileDropZone.addEventListener('dragover', (e) => { e.preventDefault(); fileDropZone.classList.add('bg-slate-750'); });
    fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('bg-slate-750'));
    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('bg-slate-750');
        if (fileInput) {
            fileInput.files = e.dataTransfer.files;
            handleFiles();
        }
    });
}

// Thay thế đoạn handleFiles cũ bằng đoạn này
function handleFiles() {
    if (!fileInput) return;
    const files = [...fileInput.files];
    const fileList = document.getElementById('file-list');
    
    if (!fileList) return;

    // Xóa danh sách cũ (nếu muốn) hoặc cộng dồn
    fileList.innerHTML = ''; 

    files.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = "p-4 flex items-center justify-between hover:bg-slate-750 transition-colors";
        li.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${file.type.includes('pdf') ? 'fa-file-pdf text-red-500' : 'fa-file-alt text-blue-500'} text-2xl mr-4"></i>
                <div>
                    <p class="font-medium text-white">${file.name}</p>
                    <p class="text-sm text-gray-400">${(file.size / 1024 / 1024).toFixed(2)} MB - Ready to train</p>
                </div>
            </div>
            <button class="text-gray-400 hover:text-red-500 transition-colors" onclick="removeFile(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        fileList.appendChild(li);
    });

    if (files.length > 0 && startTrainBtn) {
        startTrainBtn.disabled = false;
    }
}

// Thêm hàm xóa file nếu cần
window.removeFile = (index) => {
    const dt = new DataTransfer();
    const { files } = fileInput;
    for (let i = 0; i < files.length; i++) {
        if (i !== index) dt.items.add(files[i]);
    }
    fileInput.files = dt.files;
    handleFiles();
};

// --- KÍCH HOẠT API UPLOAD (RAG) ---
if (startTrainBtn) {
    startTrainBtn.addEventListener('click', async () => {
        if (fileInput && fileInput.files.length === 0) return alert('Please select files first.');

        startTrainBtn.disabled = true;
        startTrainBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Uploading & Training...';

        const formData = new FormData();
        [...fileInput.files].forEach(file => formData.append('files', file));

        try {
            // GỌI SERVER THỰC TẾ (Cổng 3001)
            const res = await fetch('http://localhost:3001/api/upload', { 
                method: 'POST', 
                body: formData 
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const data = await res.json();
            alert(data.message || 'Upload & Training Completed!');
            
        } catch (e) { 
            console.error(e);
            alert('Upload failed: ' + e.message + '. Đảm bảo Server chạy ở Port 3001.'); 
        } finally {
            startTrainBtn.disabled = false;
            startTrainBtn.innerHTML = '<i class="fas fa-cogs mr-2"></i> Start Training';
            if (fileInput) fileInput.value = '';
        }
    });
}


// =========================================
// 3. CHATBOT LOGIC (KẾT NỐI SERVER)
// =========================================
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');

if (userInput) {
    // Tự động chỉnh độ cao khung chat
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) { this.style.overflowY = 'scroll'; } else { this.style.overflowY = 'hidden'; }
    });

    // Enter để gửi
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (chatForm) chatForm.dispatchEvent(new Event('submit'));
        }
    });
}

function addMessage(text, sender) {
    if (!chatBox) return;
    const isUser = sender === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex items-start ${isUser ? 'justify-end' : ''} mb-4`;

    const avatar = isUser ? `
        <div class="flex-shrink-0 ml-3 order-2"><img src="https://i.pravatar.cc/40?img=3" alt="User" class="w-10 h-10 rounded-full border-2 border-blue-500"></div>` : `
        <div class="flex-shrink-0 mr-3"><div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"><i class="fas fa-robot text-white"></i></div></div>`;

    const contentClass = isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-700 text-gray-100 rounded-tl-none';
    
    // Nếu là AI thì render Markdown, User thì text thường
    let contentHtml = isUser ? `<p>${text}</p>` : `<div class="prose">${marked.parse(text)}</div>`;

    msgDiv.innerHTML = `${!isUser ? avatar : ''}<div class="${contentClass} p-4 rounded-lg shadow-sm max-w-[80%] ${isUser ? 'order-1' : ''}">${contentHtml}</div>${isUser ? avatar : ''}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showThinking() {
    if (!chatBox) return;
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'thinking-indicator';
    thinkingDiv.className = 'flex items-start mb-4';
    thinkingDiv.innerHTML = `
        <div class="flex-shrink-0 mr-3"><div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"><i class="fas fa-robot text-white"></i></div></div>
        <div class="bg-slate-700 p-4 rounded-lg rounded-tl-none shadow-sm relative">
            <div class="flex space-x-2 items-center h-6">
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
        </div>`;
    chatBox.appendChild(thinkingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideThinking() {
    const thinkingIndicator = document.getElementById('thinking-indicator');
    if (thinkingIndicator) thinkingIndicator.remove();
}

// --- KÍCH HOẠT API CHAT ---
if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!userInput) return;
        const question = userInput.value.trim();
        if (!question) return;

        addMessage(question, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';
        if (sendBtn) sendBtn.disabled = true;
        showThinking();

        try {
            // GỌI SERVER THỰC TẾ (Cổng 3001)
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data = await response.json();
            hideThinking();
            addMessage(data.answer || "Không có phản hồi từ AI.", 'ai');

        } catch (error) {
            console.error('Chat Error:', error);
            hideThinking();
            addMessage(`⚠️ Lỗi kết nối: ${error.message}. Đảm bảo server.js đang chạy ở port 3001.`, 'ai');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    });
}


// =========================================
// 4. MQTT & SENSOR LOGIC (GIỮ NGUYÊN TÍNH NĂNG IOT)
// =========================================
let charts = {};
let productCount = 0;
let mainChart;
let chartLabels = [];
let chartDataA = [];
let chartDataP = [];
let chartDataQ = [];
const MAX_DATA_POINTS = 20; // Số điểm dữ liệu tối đa hiển thị trên biểu đồ

let memSessionTotalCount = 0;
let memSessionOnCount = 0;
// Biến dùng để tính hiệu suất theo THỜI GIAN (Time-based)
let totalRunTimeMs = 0;     // Tổng thời gian máy chạy (mili-giây)
let totalSessionTimeMs = 0; // Tổng thời gian phiên làm việc (mili-giây)

// === BIẾN TOÀN CỤC CHO TÍNH TOÁN HIỆU SUẤT 24H ===
let lastPacketTime = 0;       // Thời gian nhận gói tin trước đó
let lastStatus = null;        // Trạng thái của gói tin trước đó (để tính interval)
let currentDay = new Date().getDate(); // Ngày hiện tại để check qua ngày mới

// Các biến tích lũy trong ngày
let dailyOnTimeMs = 0;        // Tổng thời gian bật (ms)
let dailyOffTimeMs = 0;       // Tổng thời gian tắt (ms)
let dailyCountOn = 0;         // Số lần chuyển sang ON
let dailyCountOff = 0;        // Số lần chuyển sang OFF

// --- CẤU HÌNH MQTT ---
const mqttHost = "f09366560f10477aaa3755efd93d402b.s1.eu.hivemq.cloud"; 
const mqttPort = 8884; // WSS Port
const mqttUser = "Jin_Luan1";
const mqttPass = "2196_Luan";
const mqttTopic = "vbox/may1/json_data";
const mqttTopicMembership = "vbox/membership/data";

const clientID = "web_client_" + parseInt(Math.random() * 100000);
const client = new Paho.MQTT.Client(mqttHost, mqttPort, clientID);
const data = JSON.parse(payload);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

function connectMQTT() {
    if (client && client.isConnected()) {
        console.log("⚠️ MQTT đã kết nối rồi, bỏ qua lệnh connect.");
        return;
    }

    console.log(`Đang kết nối tới ${mqttHost}:${mqttPort}...`);
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    const connectOptions = {
        onSuccess: onConnect,
        onFailure: onFailure,
        keepAliveInterval: 30,
        useSSL: true, // Bắt buộc cho HiveMQ Cloud
        userName: mqttUser,
        password: mqttPass
    };
    client.connect(connectOptions);
}

function onConnect() {
    console.log("✅ Đã kết nối MQTT thành công!");

    // Thay vì đăng ký vbox/#, hãy đăng ký cụ thể các topic bạn cần
    // Điều này đảm bảo HiveMQ định tuyến đúng tin nhắn về Web
    client.subscribe("vbox/membership/data", {
        onSuccess: function() { console.log("✅ Đã đăng ký vbox/membership/data"); },
        onFailure: function(e) { console.log("❌ Lỗi đăng ký membership"); }
    });
    
    client.subscribe("vbox/may1/json_data", {
        onSuccess: function() { console.log("✅ Đã đăng ký vbox/may1/json_data"); },
        onFailure: function(e) { console.log("❌ Lỗi đăng ký may1"); }
    });
}

function onFailure(responseObject) {
    console.error("❌ Kết nối thất bại: " + responseObject.errorMessage);
    setTimeout(connectMQTT, 5000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.warn("⚠️ Mất kết nối: " + responseObject.errorMessage);
        setTimeout(connectMQTT, 5000);
    }
}

function onMessageArrived(message) {
    // 1. Log ngay lập tức để debug xem gói tin có VÀO đến đây không
    console.log("⚡ GÓI TIN ĐẾN:", message.destinationName); 
    // console.log("📄 Nội dung thô:", message.payloadString); // Bỏ comment nếu muốn soi kỹ

    try {
        const topic = message.destinationName;
        let payload = message.payloadString;

        // --- BƯỚC 1: SỬA LỖI CÚ PHÁP JSON (NẾU CÓ) ---
        // Sửa lỗi dư dấu phẩy cuối cùng: { "a": 1, } -> { "a": 1 }
        if (payload.match(/,\s*}/)) { payload = payload.replace(/,\s*}/g, '}'); }
        
        // --- BƯỚC 2: PARSE JSON ---
        let data;
        try {
            data = JSON.parse(payload);
        } catch (err) {
            console.error("❌ Lỗi JSON không đúng chuẩn:", err);
            return;
        }

        // --- BƯỚC 3: PHÂN LOẠI THEO TOPIC ---
        
        // === TRƯỜNG HỢP A: Dữ liệu OEE máy (vbox/may1/json_data) ===
        if (topic.includes("may1/json_data")) {
            const valA = parseFloat(data.A) || 0;
            const valP = parseFloat(data.P) || 0;
            const valQ = parseFloat(data.Q) || 0;
            const d10 = parseInt(data.D10) || 0;
            const y3 = parseInt(data.Y3) || 0;
            
            // Tính toán OEE
            let valOEE = parseFloat(((valA * valP * valQ) / 10000).toFixed(2));

            // Cập nhật số liệu text
            updateDashboard(valA, valP, valQ, valOEE, d10, y3);

            // Cập nhật biểu đồ (Chart)
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
            
            // Đẩy dữ liệu vào mảng vẽ biểu đồ
            if (typeof chartLabels !== 'undefined') {
                chartLabels.push(timeStr);
                chartDataA.push(valA); 
                chartDataP.push(valP); 
                chartDataQ.push(valQ);

                // Giới hạn số điểm hiển thị (xóa điểm cũ nếu quá 20)
                if (chartLabels.length > MAX_DATA_POINTS) {
                    chartLabels.shift(); chartDataA.shift(); chartDataP.shift(); chartDataQ.shift();
                }

                if (typeof mainChart !== 'undefined' && mainChart) {
                    mainChart.updateOptions({
                        xaxis: { categories: chartLabels },
                        series: [
                            { name: 'Availability', type: 'column', data: chartDataA }, 
                            { name: 'Quality', type: 'column', data: chartDataQ }, 
                            { name: 'Performance', type: 'line', data: chartDataP }
                        ]
                    });
                }
            }
        } 
        
        // === TRƯỜNG HỢP B: Dữ liệu Membership (vbox/membership/data) ===
        else if (topic.includes("membership/data")) {
            console.log("👤 Đang xử lý Membership...");
            
            // Xử lý thông minh: Lấy data dù nó nằm ở lớp ngoài hay lồng trong biến "data"
            // Lua gửi: { data: { ma_lot... } } -> Lấy data.data
            // Gửi phẳng: { ma_lot... } -> Lấy data
            let memData = (data.data && typeof data.data === 'object') ? data.data : data;
            
            // Gọi hàm hiển thị giao diện (Hàm này ở bên dưới)
            handleMembershipData(memData);
        }

    } catch (e) {
        console.error("❌ Lỗi xử lý tin nhắn (Logic JS):", e);
    }
}

function handleMembershipData(data) {
    // Hàm phụ: Nếu dữ liệu là null, undefined, hoặc "" thì hiện "---"
    const check = (val) => (val && val !== "" && val !== "null" && String(val).trim() !== "") ? val : "---";
    const isON = (data.status == 1 || data.status == "1" || data.status === true);
    //const now = Date.now(); // Lấy thời gian hiện tại (ms)


    // 2. Logic Reset 24h (Qua ngày mới)
    const now = new Date();
    if (now.getDate() !== currentDay) {
        // Reset toàn bộ biến về 0
        console.log("🔄 Đã qua ngày mới -> Reset chỉ số hiệu suất.");
        currentDay = now.getDate();
        dailyOnTimeMs = 0;
        dailyOffTimeMs = 0;
        dailyCountOn = 0;
        dailyCountOff = 0;
        lastPacketTime = 0; // Reset mốc thời gian để tránh cộng sai số lớn
        lastStatus = null;
    }

    const nowMs = now.getTime();

    // 3. Tính toán thời gian (Interval) & Đếm số lần
    if (lastPacketTime > 0 && lastStatus !== null) {
        const timeDiff = nowMs - lastPacketTime;

        // Chỉ chấp nhận khoảng thời gian hợp lý (< 5 phút) để tránh lỗi khi mất mạng quá lâu
        if (timeDiff > 0 && timeDiff < 300000) {
            
            // CỘNG THỜI GIAN VÀO TRẠNG THÁI CŨ
            // (Nếu trạng thái trước đó là ON, thì khoảng thời gian vừa trôi qua là thời gian chạy)
            if (lastStatus === true) {
                dailyOnTimeMs += timeDiff;
            } else {
                dailyOffTimeMs += timeDiff;
            }

            // ĐẾM SỐ LẦN CHUYỂN TRẠNG THÁI
            // Nếu trạng thái hiện tại KHÁC trạng thái trước -> Có sự thay đổi
            if (isON !== lastStatus) {
                if (isON) {
                    dailyCountOn++; // Chuyển từ OFF -> ON
                } else {
                    dailyCountOff++; // Chuyển từ ON -> OFF
                }
            }
        }
    } else {
        // Gói tin đầu tiên trong phiên hoặc sau khi reset
        // Chỉ ghi nhận trạng thái để lần sau tính
    }

    // Cập nhật mốc cho lần sau
    lastPacketTime = nowMs;
    lastStatus = isON;

    // 4. Tính tỷ số Hiệu suất (%)
    // Công thức: Thời gian ON / (Thời gian ON + Thời gian OFF)
    let totalTime = dailyOnTimeMs + dailyOffTimeMs;
    let efficiency = 0;
    if (totalTime > 0) {
        efficiency = ((dailyOnTimeMs / totalTime) * 100).toFixed(1);
    }

    // 5. Cập nhật Giao diện (UI)
    const elEfficiency = document.getElementById('mem-efficiency');
    const elCountOn = document.getElementById('mem-count-on');
    const elCountOff = document.getElementById('mem-count-off');

    if (elEfficiency) elEfficiency.innerText = efficiency + "%";
    if (elCountOn) elCountOn.innerText = dailyCountOn;
    if (elCountOff) elCountOff.innerText = dailyCountOff;

    // 1. Cập nhật các trường thông tin Text
    if(document.getElementById('mem-lot-code')) 
        document.getElementById('mem-lot-code').innerText = check(data.ma_lot);

    if(document.getElementById('mem-emp-id')) 
        document.getElementById('mem-emp-id').innerText = check(data.ma_nhan_vien);

    if(document.getElementById('mem-date')) 
        document.getElementById('mem-date').innerText = check(data.ngay_sx); 

    if(document.getElementById('mem-time')) 
        document.getElementById('mem-time').innerText = check(data.tg_sx); 
        
    if(document.getElementById('mem-total')) 
        document.getElementById('mem-total').innerText = (data.total !== undefined && data.total !== "") ? Number(data.total).toLocaleString() : "0";

    if(document.getElementById('mem-power')) 
        document.getElementById('mem-power').innerText = (data.power !== undefined && data.power !== "") ? Number(data.power).toLocaleString() : "0";

    // 2. Cập nhật trạng thái ON/OFF (Hình tròn xanh/xám)
    const indicator = document.getElementById('membershipStatusIndicator');
    
    if (indicator) {
        // Chuyển đổi status sang Boolean (chấp nhận cả số 1 hoặc chuỗi "1" hoặc true)
        const isON = (data.status == 1 || data.status == "1" || data.status === true);
        
        if (isON) {
            indicator.className = "w-40 h-40 rounded-full bg-slate-700 flex flex-col items-center justify-center shadow-lg border-4 border-green-500 status-on";
            // Cập nhật icon và text bên trong (nếu có)
            const icon = indicator.querySelector('i');
            if(icon) icon.className = "fas fa-check-circle text-5xl mb-2 text-green-500";
            const span = indicator.querySelector('span');
            if(span) span.innerText = "ON";
        } else {
            indicator.className = "w-40 h-40 rounded-full bg-slate-700 flex flex-col items-center justify-center shadow-lg border-4 border-slate-600 status-off";
            const icon = indicator.querySelector('i');
            if(icon) icon.className = "fas fa-power-off text-5xl mb-2 text-gray-400";
            const span = indicator.querySelector('span');
            if(span) span.innerText = "OFF";
        }
    }
}
function updateDashboard(valA, valP, valQ, valOEE, d10, y3) {
    // Cập nhật Text
    if(document.getElementById('val-oee')) document.getElementById('val-oee').innerText = valOEE + "%";
    if(document.getElementById('val-a')) document.getElementById('val-a').innerText = valA + "%";
    if(document.getElementById('val-p')) document.getElementById('val-p').innerText = valP + "%";
    if(document.getElementById('val-q')) document.getElementById('val-q').innerText = valQ + "%";

    // Cập nhật Biểu đồ
    if(charts.oee) charts.oee.updateSeries([valOEE]);
    if(charts.a) charts.a.updateSeries([valA]);
    if(charts.p) charts.p.updateSeries([valP]);
    if(charts.q) charts.q.updateSeries([valQ]);

    // Cập nhật Trạng thái ON/OFF
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIcon');

    if(statusIndicator && statusText && statusIcon) {
        if (y3 > 0) { 
            statusIndicator.className = "w-32 h-28 rounded-full bg-green-900/20 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] border-4 border-green-500 transition-all duration-500";
            statusText.innerText = "ON"; 
            statusText.className = "text-green-400 font-bold text-xl uppercase";
            statusIcon.className = "fas fa-check-circle text-4xl mb-1 text-green-400";
        } else {
            statusIndicator.className = "w-32 h-28 rounded-full bg-slate-800 flex flex-col items-center justify-center shadow-lg border-4 border-slate-600 transition-all duration-500";
            statusText.innerText = "OFF"; 
            statusText.className = "text-gray-400 font-bold text-xl uppercase";
            statusIcon.className = "fas fa-power-off text-4xl mb-1 text-gray-400";
        }
    }

    const memIndicator = document.getElementById('membershipStatusIndicator');
    if (memIndicator) {
        const memText = memIndicator.querySelector('span');
        const memIcon = memIndicator.querySelector('i');

        if (y3 > 0) { // Máy đang chạy
            memIndicator.classList.remove('status-off');
            memIndicator.classList.add('status-on');
            if(memText) memText.innerText = "ON";
            if(memIcon) memIcon.className = "fas fa-check-circle text-5xl mb-2";
        } else { // Máy dừng
            memIndicator.classList.remove('status-on');
            memIndicator.classList.add('status-off');
            if(memText) memText.innerText = "OFF";
            if(memIcon) memIcon.className = "fas fa-power-off text-5xl mb-2";
        }
    }

    // Cập nhật Sản lượng
    if (d10 > 0 && document.getElementById('productCountDisplay')) {
        document.getElementById('productCountDisplay').innerText = d10.toLocaleString();
    }
}

function initSensorCharts() {
    // Chỉ khởi tạo nếu có element
    const elOEE = document.querySelector("#gaugeOEE_mini");
    
    if (!elOEE) return;

    const miniGaugeOptions = (color) => ({
        chart: { type: 'radialBar', height: 110, sparkline: { enabled: true } },
        plotOptions: {
            radialBar: {
                hollow: { size: '50%' },
                track: { background: '#334155', strokeWidth: '100%' },
                dataLabels: { show: false }
            }
        },
        colors: [color],
        stroke: { lineCap: 'round' },
        series: [0],
    });

    charts.oee = new ApexCharts(document.querySelector("#gaugeOEE_mini"), miniGaugeOptions('#818cf8'));
    charts.a = new ApexCharts(document.querySelector("#gaugeA_mini"), miniGaugeOptions('#10B981'));
    charts.p = new ApexCharts(document.querySelector("#gaugeP_mini"), miniGaugeOptions('#3B82F6'));
    charts.q = new ApexCharts(document.querySelector("#gaugeQ_mini"), miniGaugeOptions('#F59E0B'));

    Object.values(charts).forEach(c => c.render());

    if(document.querySelector("#mainProductionChart")) {
        const mainChartOptions = {
            series: [{ name: 'Availability', type: 'column', data: [] }, { name: 'Quality', type: 'column', data: [] }, { name: 'Performance', type: 'line', data: [] }],
            chart: { height: 350, type: 'line', toolbar: { show: false }, background: 'transparent' },
            stroke: { width: [0, 0, 3], curve: 'smooth' },
            plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
            colors: ['#3B82F6', '#10B981', '#F59E0B'],
            xaxis: { categories: [], axisBorder: { show: false }, labels: { style: { colors: '#64748b' } } },
            yaxis: { max: 100, labels: { style: { colors: '#64748b' } } },
            grid: { borderColor: '#334155', strokeDashArray: 4 },
            legend: { show: false },
            theme: { mode: 'dark' }
        };
        mainChart = new ApexCharts(document.querySelector("#mainProductionChart"), mainChartOptions);
        mainChart.render();
        updateMainChartFromSupabase();
        setInterval(updateMainChartFromSupabase, 30000);
    }
    
    // Gọi kết nối MQTT
    connectMQTT();
}