require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Create uploads directory
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(UploadsDir, { recursive: true });
  fs.chmodSync(UploadsDir, 0o777);
}

// Middleware
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per IP
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:7771',
  'http://localhost:7772',
  'http://localhost:7773',
  'http://localhost:5000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5503' // Added for VS Code Live Server
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.DB_NAME || 'job_applications',
  password: process.env.DB_PASSWORD || 'Password@12345',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test database connection and create table
async function initializeDatabase() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS appliedjobs (
        id SERIAL PRIMARY KEY,
        reference_id VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mobile VARCHAR(10) NOT NULL,
        job_role VARCHAR(50) NOT NULL,
        expected_salary INTEGER,
        preferred_location VARCHAR(50),
        notice_period VARCHAR(20),
        technical_skill1 VARCHAR(50),
        technical_skill2 VARCHAR(50),
        key_skills TEXT,
        dob DATE,
        parent_name VARCHAR(100),
        gender VARCHAR(20),
        nationality VARCHAR(50),
        marital_status VARCHAR(20),
        current_address TEXT,
        permanent_address TEXT,
        state VARCHAR(50),
        city VARCHAR(50),
        zipcode VARCHAR(6),
        emergency_contact VARCHAR(10),
        alt_mobile VARCHAR(10),
        linkedin VARCHAR(255),
        github VARCHAR(255),
        ssc_board VARCHAR(50),
        ssc_year INTEGER,
        ssc_percentage VARCHAR(10),
        intermediate_board VARCHAR(50),
        intermediate_year INTEGER,
        intermediate_percentage VARCHAR(10),
        college_name VARCHAR(100),
        qualification VARCHAR(50),
        branch VARCHAR(50),
        graduation_year INTEGER,
        graduation_percentage VARCHAR(10),
        certifications TEXT,
        experience_status VARCHAR(20),
        years_experience INTEGER,
        company_name VARCHAR(100),
        designation VARCHAR(50),
        work_location VARCHAR(50),
        start_date VARCHAR(7),
        end_date VARCHAR(7),
        last_salary INTEGER,
        reference_name VARCHAR(100),
        reference_email VARCHAR(255),
        resume_path VARCHAR(255),
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('Table "appliedjobs" created or already exists');
  } catch (err) {
    console.error('Database initialization error:', err.stack);
  }
}
initializeDatabase();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get single application
app.get('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM appliedjobs WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch application' });
  }
});

// Get all applications
app.get('/api/applications', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status
      ? 'SELECT * FROM appliedjobs WHERE status = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM appliedjobs ORDER BY created_at DESC';
    const params = status ? [status] : [];
    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// Download file
app.get('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ success: false, error: 'Failed to download file' });
      }
    });
  } else {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// Submit job application
app.post('/api/submit', upload.single('resume'), async (req, res) => {
  try {
    const requiredFields = [
      'full_name', 'email', 'mobile', 'job_role', 'preferred_location',
      'notice_period', 'key_skills', 'dob', 'parent_name', 'gender',
      'nationality', 'current_address', 'permanent_address', 'state',
      'city', 'zipcode', 'emergency_contact', 'ssc_board', 'ssc_year',
      'ssc_percentage', 'intermediate_board', 'intermediate_year',
      'intermediate_percentage', 'college_name', 'qualification', 'branch',
      'graduation_year', 'graduation_percentage', 'experience_status'
    ];
    const missingFields = requiredFields.filter(field => !req.body[field] && req.body[field] !== '');
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields', missing: missingFields });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Resume file is required' });
    }

    const reference_id = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const query = `
      INSERT INTO appliedjobs (
        reference_id, full_name, email, mobile, job_role, expected_salary,
        preferred_location, notice_period, technical_skill1, technical_skill2,
        key_skills, dob, parent_name, gender, nationality, marital_status,
        current_address, permanent_address, state, city, zipcode,
        emergency_contact, alt_mobile, linkedin, github, ssc_board, ssc_year,
        ssc_percentage, intermediate_board, intermediate_year, intermediate_percentage,
        college_name, qualification, branch, graduation_year, graduation_percentage,
        certifications, experience_status, years_experience, company_name,
        designation, work_location, start_date, end_date, last_salary,
        reference_name, reference_email, resume_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43,
        $44, $45, $46, $47, $48
      ) RETURNING id, reference_id
    `;
    const values = [
      reference_id,
      req.body.full_name,
      req.body.email,
      req.body.mobile,
      req.body.job_role,
      req.body.expected_salary || null,
      req.body.preferred_location,
      req.body.notice_period,
      req.body.technical_skill1 || null,
      req.body.technical_skill2 || null,
      req.body.key_skills,
      req.body.dob,
      req.body.parent_name,
      req.body.gender,
      req.body.nationality,
      req.body.marital_status || null,
      req.body.current_address,
      req.body.permanent_address,
      req.body.state,
      req.body.city,
      req.body.zipcode,
      req.body.emergency_contact,
      req.body.alt_mobile || null,
      req.body.linkedin || null,
      req.body.github || null,
      req.body.ssc_board,
      req.body.ssc_year,
      req.body.ssc_percentage,
      req.body.intermediate_board,
      req.body.intermediate_year,
      req.body.intermediate_percentage,
      req.body.college_name,
      req.body.qualification,
      req.body.branch,
      req.body.graduation_year,
      req.body.graduation_percentage,
      req.body.certifications || null,
      req.body.experience_status,
      req.body.years_experience || null,
      req.body.company_name || null,
      req.body.designation || null,
      req.body.work_location || null,
      req.body.start_date || null,
      req.body.end_date || null,
      req.body.last_salary || null,
      req.body.reference_name || null,
      req.body.reference_email || null,
      path.basename(req.file.path)
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Submission error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update application status
app.put('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }
    const result = await pool.query(
      'UPDATE appliedjobs SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// Serve static files
app.use('/Uploads', express.static(uploadsDir));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: 'File upload error', message: err.message });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, error: 'CORS policy violation' });
  }
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down.');
  server.close(() => {
    pool.end();
    console.log('Server closed. Database connection ended.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down.');
  server.close(() => {
    pool.end();
    console.log('Server closed. Database connection ended.');
    process.exit(0);
  });
});

module.exports = app;