const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Determine environment and paths
const isVercel = process.env.VERCEL === '1';
const TMP_DIR = isVercel ? '/tmp' : path.join(__dirname, '../public/uploads/chat-images');
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, 'data');

// Ensure directories exist
if (!fs.existsSync(TMP_DIR)) {
    try {
        fs.mkdirSync(TMP_DIR, { recursive: true });
        console.log(`Created directory: ${TMP_DIR}`);
    } catch (err) {
        console.error(`Error creating directory ${TMP_DIR}:`, err);
    }
}

// Helper to get file path
const getFilePath = (filename) => {
    // For local dev, keep original structure. For Vercel, everything goes to /tmp or we read initial data from source
    if (!isVercel) {
        return path.join(DATA_DIR, filename);
    }

    // On Vercel:
    // 1. Try to read from /tmp (if we wrote it there in this warm instance)
    const tmpPath = path.join(TMP_DIR, filename);
    if (fs.existsSync(tmpPath)) {
        return tmpPath;
    }

    // 2. Fallback to source file (read-only initial data)
    // Note: We can't write back to this, so we'll copy to /tmp on first write
    return path.join(__dirname, 'data', filename);
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TMP_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Faqat rasm fayllari qabul qilinadi! (png, jpg, jpeg, gif)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const readData = (filename, callback) => {
    const filePath = getFilePath(filename);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            // If file doesn't exist in /tmp or source, return empty default
            if (err.code === 'ENOENT') {
                const defaultData = (filename === 'messages.json' || filename === 'services.json') ? [] : {};
                return callback(null, defaultData);
            }
            console.error("Error reading file:", filePath, err);
            return callback(err, null);
        }
        try {
            const jsonData = data ? JSON.parse(data) : ((filename === 'messages.json' || filename === 'services.json') ? [] : {});
            callback(null, jsonData);
        } catch (parseErr) {
            console.error("Error parsing JSON from file:", filePath, parseErr);
            callback(parseErr, null);
        }
    });
};

const writeData = (filename, data, callback) => {
    // Always write to /tmp on Vercel
    const writeDir = isVercel ? TMP_DIR : DATA_DIR;
    const filePath = path.join(writeDir, filename);

    // Ensure directory exists (redundant check but safe)
    if (!fs.existsSync(writeDir)) {
        try {
            fs.mkdirSync(writeDir, { recursive: true });
        } catch (e) {
            console.error("Failed to create write dir:", e);
        }
    }

    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) {
            console.error("Error writing file:", filePath, err);
            return callback(err);
        }
        callback(null);
    });
};

app.get('/api/services', (req, res) => {
    readData('services.json', (err, services) => {
        if (err) return res.status(500).json({ message: "Error reading services data" });
        res.json(services);
    });
});

app.post('/api/services', (req, res) => {
    readData('services.json', (err, services) => {
        if (err) return res.status(500).json({ message: "Error reading services data" });

        const newService = req.body;
        newService.id = Date.now();
        services.push(newService);

        writeData('services.json', services, (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "Error saving new service" });
            res.status(201).json(newService);
        });
    });
});

app.get('/api/chat/messages', (req, res) => {
    readData('messages.json', (err, messages) => {
        if (err) return res.status(500).json({ message: "Error reading messages" });
        res.json(messages);
    });
});

app.post('/api/chat/messages', upload.single('chatImage'), (req, res) => {
    readData('messages.json', (err, messages) => {
        if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: "Error reading messages data" });
        }

        const { user, text } = req.body;
        const newMessage = {
            id: Date.now(),
            user: user,
            text: text || null,
            imageUrl: null,
            timestamp: new Date().toLocaleString('uz-UZ', { hour12: false })
        };

        if (req.file) {
            // On Vercel, we can't serve files from /tmp directly via express.static easily without a custom route
            // For now, we'll just return the filename and hope the client can handle it or we add a route
            // But standard static serving won't work for /tmp files.
            // We will add a specific route to serve images from /tmp if on Vercel.
            newMessage.imageUrl = `/api/uploads/${req.file.filename}`;
        }

        if (!newMessage.text && !newMessage.imageUrl) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Xabar yoki rasm bo'lishi shart." });
        }

        messages.push(newMessage);

        writeData('messages.json', messages, (writeErr) => {
            if (writeErr) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(500).json({ message: "Error saving message" });
            }
            res.status(201).json(newMessage);
        });
    });
});

// Special route to serve uploaded images from /tmp on Vercel
app.get('/api/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = isVercel ? path.join(TMP_DIR, filename) : path.join(__dirname, '../public/uploads/chat-images', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Image not found');
    }
});

app.get('/api/settings/working-hours', (req, res) => {
    readData('settings.json', (err, settings) => {
        if (err) return res.status(500).json({ message: "Error reading settings" });
        res.json(settings.workingHours || { days: 'Noma\'lum', startTime: '--:--', endTime: '--:--' });
    });
});

app.put('/api/settings/working-hours', (req, res) => {
    readData('settings.json', (err, settings) => {
        if (err) return res.status(500).json({ message: "Error reading settings" });

        settings.workingHours = req.body;

        writeData('settings.json', settings, (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "Error updating settings" });
            res.json(settings.workingHours);
        });
    });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        res.json({ success: true, message: "Login successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: `Fayl yuklashda xatolik: ${error.message}. Fayl hajmi 5MB dan oshmasligi kerak.` });
    } else if (error) {
        return res.status(400).json({ message: error.message });
    }
    next();
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;



