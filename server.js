// server.js - Backend Ổn định với thư viện @google/generative-ai
// Cài đặt: npm install express cors multer dotenv pdf-parse mammoth @supabase/supabase-js mqtt @google/generative-ai

// --- Import các thư viện (Dùng require chuẩn) ---
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { createClient } = require('@supabase/supabase-js');
const mqtt = require('mqtt');
//  THAY ĐỔI QUAN TRỌNG: Dùng thư viện ổn định
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

// --- Bọc logic server trong hàm async (giữ cấu trúc cũ của bạn) ---
async function startServer() {

  const app = express();
  const port = 3001;

  // --- Middleware ---
  app.use(cors());
  app.use(express.json());

  // --- Cấu hình Multer ---
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // --- Cấu hình Supabase ---
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // ---  CẤU HÌNH AI (THƯ VIỆN MỚI ỔN ĐỊNH) ---
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Khởi tạo Model Chat (gemini-2.5-flash: Nhanh, Rẻ, Ổn định)
  const chatModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
    }
  });

// Khởi tạo Model Embedding - Đảm bảo tên model chính xác
  const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-001" });
  

  /* ==========================================================
     🔌 CẤU HÌNH MQTT CLIENT
  ========================================================== */
  const USE_HIVEMQ_CLOUD = true; 
  let mqttOptions = {};
  let MQTT_HOST = '';
  const MQTT_TOPIC_DATA = 'vbox/may1/json_data';

  if (USE_HIVEMQ_CLOUD) {
      // HIVEMQ CLOUD
      MQTT_HOST = 'f09366560f10477aaa3755efd93d402b.s1.eu.hivemq.cloud'; 
      mqttOptions = {
        port: 8883,
        protocol: 'mqtts',
        username: 'Jin_Luan1', 
        password: '2196_Luan', 
        rejectUnauthorized: true,
        reconnectPeriod: 2000,
      };
      console.log(`🔌 Đang chạy chế độ: HIVEMQ CLOUD (SSL)...`);
  } else {
      // PUBLIC TEST
      MQTT_HOST = 'test.mosquitto.org';
      mqttOptions = {
        port: 8883,
        protocol: 'mqtts',
        rejectUnauthorized: false,
        reconnectPeriod: 2000,
      };
      console.log(`🔌 Đang chạy chế độ: PUBLIC TEST (Mosquitto SSL)...`);
  }

  const mqttClient = mqtt.connect(`mqtts://${MQTT_HOST}`, mqttOptions);

  /* ==========================================================
      LOGIC IoT: PHÁT HIỆN THAY ĐỔI & LƯU DB
  ========================================================== */
  let lastKnownState = { A: null, P: null, Q: null };

  function hasDataChanged(newData, oldData) {
    if (oldData.A === null) return true;
    const tolerance = 0.1;
    const diffA = Math.abs(newData.A - oldData.A);
    const diffP = Math.abs(newData.P - oldData.P);
    const diffQ = Math.abs(newData.Q - oldData.Q);
    return (diffA > tolerance || diffP > tolerance || diffQ > tolerance);
  }

  mqttClient.on('connect', () => {
    console.log(`✅ MQTT Connected: ${MQTT_HOST}`);
    mqttClient.subscribe(MQTT_TOPIC_DATA, (err) => {
      if (!err) console.log(`📡 Đang lắng nghe topic: "${MQTT_TOPIC_DATA}"`);
    });
  });
//
  mqttClient.on('message', async (topic, message) => {
    try {
      if (topic === MQTT_TOPIC_DATA) {
        const data = JSON.parse(message.toString());
        if (data.A !== undefined && data.P !== undefined && data.Q !== undefined) {
            if (hasDataChanged(data, lastKnownState)) {
                console.log(`⚡ IoT Data Changed: A=${data.A}, P=${data.P}, Q=${data.Q}`);
                lastKnownState = { A: data.A, P: data.P, Q: data.Q };

                console.log('💾 Saving to Supabase...');
                const { error } = await supabase.from('OEE_Data').insert([{
                    'A (%)': parseFloat(data.A),
                    'P (%)': parseFloat(data.P),
                    'Q (%)': parseFloat(data.Q),
                    'Timestamp': new Date().toISOString()
                }]);
                if (error) console.error('❌ Supabase Error:', error.message);
                else console.log('✅ Saved!');
            }
        }
      }
    } catch (e) {}
  });

  /* ==========================================================
      CÁC HÀM HỖ TRỢ AI (Đã cập nhật cú pháp mới)
  ========================================================== */

  async function extractTextFromFile(buffer, mimeType) {
    try {
      if (mimeType === 'application/pdf') return (await pdf(buffer)).text;
      if (mimeType.includes('wordprocessingml')) return (await mammoth.extractRawText({ buffer })).value;
      if (mimeType === 'text/plain') return buffer.toString('utf-8');
      return null;
    } catch (err) { throw new Error('Lỗi đọc file.'); }
  }

  function chunkText(text, chunkSize = 1000, overlap = 150) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + chunkSize, text.length);
      chunks.push(text.slice(i, end));
      i += (chunkSize - overlap);
    }
    return chunks;
  }

  // 🔥 Cú pháp Embedding của thư viện ổn định
  async function createEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding Error:", error);
        return [];
    }
  }

  // 🔥 Cú pháp Chat của thư viện ổn định
  async function generateContent(prompt) {
    try {
      const result = await chatModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) { 
        console.error('AI Gen Error:', err); 
        if (err.message && err.message.includes('429')) return "⚠️ Hệ thống quá tải (429). Thử lại sau.";
        return `Lỗi AI: ${err.message}`; 
    }
  }

  function parseOEEQuery(question) {
    const regexA = /(?:tỷ lệ khả dụng|khả dụng|availability|A)\b[^=\d:]*[=:\slà]\s*([\d.]+)/i;
    const regexP = /(?:hiệu suất máy|hiệu suất|performance|P)\b[^=\d:]*[=:\slà]\s*([\d.]+)/i;
    const regexQ = /(?:tỷ lệ chất lượng|chất lượng|quality|Q)\b[^=\d:]*[=:\slà]\s*([\d.]+)/i;
    const matchA = question.match(regexA);
    const matchP = question.match(regexP);
    const matchQ = question.match(regexQ);
    return { 
      a: matchA ? parseFloat(matchA[1]) : null, 
      p: matchP ? parseFloat(matchP[1]) : null, 
      q: matchQ ? parseFloat(matchQ[1]) : null 
    };
  }

  function getOEEEvaluation(oee) {
    if (oee > 85) return "Rất tốt (Đẳng cấp thế giới 🏆)";
    if (oee > 60) return "Tốt (Cần cải thiện thêm 🛠️)";
    return "Kém (Cần khắc phục ngay ⚠️)";
  }

  /* ==========================================================
     🔹 API ROUTES
  ========================================================== */

  // 1️⃣ API Upload File
  app.post('/api/upload', upload.array('files'), async (req, res) => {
    console.log('📂 Processing upload...');
    if (!req.files?.length) return res.status(400).json({ error: 'No files' });
    
    try {
      let processedCount = 0;
      for (const file of req.files) {
         const text = await extractTextFromFile(file.buffer, file.mimetype);
         if (!text) continue;
         
         await supabase.storage.from('materials').upload(file.originalname, file.buffer, { contentType: file.mimetype, upsert: true });

         const chunks = chunkText(text);
         const docs = [];
         for (const chunk of chunks) {
           const emb = await createEmbedding(chunk);
           if (emb && emb.length > 0) {
             docs.push({ file_name: file.originalname, content: chunk, embedding: emb });
           }
         }
         
         if (docs.length > 0) {
            const { error: dbError } = await supabase.from('documents').insert(docs);
            if (dbError) throw new Error(`Lỗi DB: ${dbError.message}`);
         }
         processedCount++;
         console.log(`✅ Done: ${file.originalname}`);
      }
      res.json({ message: `Upload thành công ${processedCount} file!` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2️⃣ API Chat
  app.post('/api/chat', async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Empty question' });

    try {
      // A. Logic OEE
      if (question.toLowerCase().includes('oee')) {
        const { a, p, q } = parseOEEQuery(question);
        
        if (a !== null && p !== null && q !== null) {
          const oee = (a * p * q) / 10000;
          return res.json({ answer: `🧮 Kết quả: OEE = ${oee.toFixed(2)}%\nĐánh giá: ${getOEEEvaluation(oee)}` });
        } else {
          const { data } = await supabase.from('OEE_Data').select('*').order('Timestamp', { ascending: false }).limit(1);
          if (data && data.length > 0) {
             const row = data[0];
             const oee = (row['A (%)'] * row['P (%)'] * row['Q (%)']) / 10000;
             const time = new Date(row['Timestamp']).toLocaleString('vi-VN');
             const prompt = `Dữ liệu máy (${time}): A=${row['A (%)']}, P=${row['P (%)']}, Q=${row['Q (%)']}. OEE=${oee.toFixed(2)}. User hỏi: "${question}". Đóng vai kỹ sư trưởng phân tích.`;
             const aiAnswer = await generateContent(prompt);
             return res.json({ answer: aiAnswer });
          }
        }
      }

      // B. Logic RAG
      const queryEmb = await createEmbedding(question);
      if (!queryEmb || queryEmb.length === 0) return res.json({ answer: "⚠️ Lỗi: Không thể tạo vector cho câu hỏi (Lỗi Model Embedding)." });

      const { data: docs } = await supabase.rpc('match_documents', { 
          query_embedding: queryEmb, 
          match_threshold: 0.50, 
          match_count: 5 
      });

      // THÊM: Kiểm tra chặt chẽ
      if (!docs || docs.length === 0) {
          return res.json({ answer: "⚠️ Không tìm thấy thông tin nào trong tài liệu liên quan đến câu hỏi này." });
      }

      const context = docs && docs.length > 0 ? docs.map(d => d.content).join('\n\n') : "";
      const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nTrả lời dựa trên Context. Nếu không có thông tin, nói không biết.`;
      
      const answer = await generateContent(prompt);
      res.json({ answer });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 Server chạy tại http://localhost:${port}`);
    console.log(`   - Model: gemini-1.5-flash`);
    console.log(`   - MQTT: ${USE_HIVEMQ_CLOUD ? 'HiveMQ' : 'Public Test'}`);
  });
}

startServer().catch(err => console.error("❌ Lỗi khởi động:", err));