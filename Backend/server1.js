const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 5000;

// Configure CORS to allow multiple origins
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:5503'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., Postman) or allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// Configure PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'job_applications',
    password: 'Password@12345', // Replace with your PostgreSQL password
    port: 5432,
});

// Create database and table if they don't exist
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        // Create database if it doesn't exist
        await client.query(`
            SELECT 'CREATE DATABASE job_applications'
            WHERE NOT EXISTS (
                SELECT FROM pg_database WHERE datname = 'job_applications'
            )`);
        
        // Connect to job_applications database
        await client.query('SET search_path TO public');

        // Create applications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                parent_name VARCHAR(255) NOT NULL,
                gender VARCHAR(20) NOT NULL,
                dob DATE NOT NULL,
                nationality VARCHAR(100) NOT NULL DEFAULT 'Indian',
                marital_status VARCHAR(50),
                current_address TEXT NOT NULL,
                permanent_address TEXT NOT NULL,
                state VARCHAR(100) NOT NULL,
                city VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                mobile VARCHAR(10) NOT NULL,
                alt_mobile VARCHAR(10),
                aadhaar VARCHAR(12),
                pan VARCHAR(10),
                zipcode VARCHAR(6) NOT NULL,
                linkedin TEXT NOT NULL,
                github TEXT NOT NULL,
                emergency_contact VARCHAR(10) NOT NULL,
                portfolio TEXT NOT NULL,
                qualification VARCHAR(100) NOT NULL,
                institute VARCHAR(255) NOT NULL,
                board VARCHAR(255) NOT NULL,
                year_passing INTEGER NOT NULL,
                percentage NUMERIC(5,2) NOT NULL,
                branch VARCHAR(100) NOT NULL,
                technical_skill1 VARCHAR(100) NOT NULL,
                technical_skill2 VARCHAR(100) NOT NULL,
                certifications TEXT,
                certificate_upload_path TEXT,
                experience_status VARCHAR(20),
                company_name VARCHAR(255),
                designation VARCHAR(255),
                years_experience INTEGER,
                work_location VARCHAR(100),
                last_salary NUMERIC,
                experience_certificate_path TEXT,
                prev_company1 VARCHAR(255) NOT NULL,
                prev_designation1 VARCHAR(255) NOT NULL,
                prev_start1 VARCHAR(7) NOT NULL,
                prev_end1 VARCHAR(7) NOT NULL,
                job_role VARCHAR(100) NOT NULL,
                preferred_location VARCHAR(100),
                expected_salary NUMERIC,
                notice_period VARCHAR(50) NOT NULL,
                key_skills TEXT NOT NULL,
                reference_name VARCHAR(255),
                reference_email VARCHAR(255),
                resume_path TEXT NOT NULL,
                terms BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database and table initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        client.release();
    }
}

// Initialize database on server start
initializeDatabase().catch(err => console.error('Initialization failed:', err));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: PDF, DOC, JPG, PNG'), false);
        }
    }
});

const uploadFields = upload.fields([
    { name: 'certificateUpload', maxCount: 1 },
    { name: 'experienceCertificate', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
]);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to parse JSON
app.use(express.json());

// Serve applicant form
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'indexx.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Applicant form file (index.html) not found' });
    }
});

// Serve HR dashboard
app.get('/hr', (req, res) => {
    const filePath = path.join(__dirname, 'hr.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'HR dashboard file (hr.html) not found' });
    }
});

// Submit application
app.post('/api/submit', uploadFields, async (req, res) => {
    try {
        const formData = req.body;
        const files = req.files;

        // Prepare file paths
        const certificatePath = files.certificateUpload ? files.certificateUpload[0].path : null;
        const experiencePath = files.experienceCertificate ? files.experienceCertificate[0].path : null;
        const resumePath = files.resume ? files.resume[0].path : null;

        if (!resumePath) {
            return res.status(400).json({ error: 'Resume is required' });
        }

        const query = `
            INSERT INTO applications (
                full_name, parent_name, gender, dob, nationality, marital_status, current_address,
                permanent_address, state, city, email, mobile, alt_mobile, aadhaar, pan, zipcode,
                linkedin, github, emergency_contact, portfolio, qualification, institute, board,
                year_passing, percentage, branch, technical_skill1, technical_skill2, certifications,
                certificate_upload_path, experience_status, company_name, designation, years_experience,
                work_location, last_salary, experience_certificate_path, prev_company1, prev_designation1,
                prev_start1, prev_end1, job_role, preferred_location, expected_salary, notice_period,
                key_skills, reference_name, reference_email, resume_path, terms
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
                $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50
            ) RETURNING id;
        `;

        const values = [
            formData.fullName || '',
            formData.parentName || '',
            formData.gender || '',
            formData.dob || '',
            formData.nationality || 'Indian',
            formData.maritalStatus || null,
            formData.currentAddress || '',
            formData.permanentAddress || '',
            formData.state || '',
            formData.city || '',
            formData.email || '',
            formData.mobile || '',
            formData.altMobile || null,
            formData.aadhaar || null,
            formData.pan || null,
            formData.zipcode || '',
            formData.linkedin || '',
            formData.github || '',
            formData.emergencyContact || '',
            formData.portfolio || '',
            formData.qualification || '',
            formData.institute || '',
            formData.board || '',
            parseInt(formData.yearPassing) || 0,
            parseFloat(formData.percentage) || 0,
            formData.branch || '',
            formData.technicalSkill1 || '',
            formData.technicalSkill2 || '',
            formData.certifications || null,
            certificatePath,
            formData.experienceStatus || null,
            formData.companyName || null,
            formData.designation || null,
            formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
            formData.workLocation || null,
            formData.lastSalary ? parseFloat(formData.lastSalary) : null,
            experiencePath,
            formData.prevCompany1 || '',
            formData.prevDesignation1 || '',
            formData.prevStart1 || '',
            formData.prevEnd1 || '',
            formData.jobRole || '',
            formData.preferredLocation || null,
            formData.expectedSalary ? parseFloat(formData.expectedSalary) : null,
            formData.noticePeriod || '',
            formData.keySkills || '',
            formData.referenceName || null,
            formData.referenceEmail || null,
            resumePath,
            formData.terms === 'true',
        ];

        // Server-side validation with detailed error reporting
        const requiredFields = [
            'fullName', 'parentName', 'gender', 'dob', 'currentAddress', 'permanentAddress',
            'state', 'city', 'email', 'mobile', 'zipcode', 'linkedin', 'github',
            'emergencyContact', 'portfolio', 'qualification', 'institute', 'board',
            'yearPassing', 'percentage', 'branch', 'technicalSkill1', 'technicalSkill2',
            'prevCompany1', 'prevDesignation1', 'prevStart1', 'prevEnd1', 'jobRole',
            'noticePeriod', 'keySkills'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]);
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        if (formData.experienceStatus === 'Experienced') {
            const experiencedFields = ['companyName', 'designation', 'yearsExperience'];
            const missingExperiencedFields = experiencedFields.filter(field => !formData[field]);
            if (missingExperiencedFields.length > 0) {
                console.error('Missing experienced fields:', missingExperiencedFields);
                return res.status(400).json({ error: `Missing fields for Experienced status: ${missingExperiencedFields.join(', ')}` });
            }
        }

        const result = await pool.query(query, values);
        res.status(201).json({ message: 'Application submitted successfully', id: result.rows[0].id });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Get all applications for HR
app.get('/api/applications', async (req, res) => {
    try {
        const query = 'SELECT * FROM applications ORDER BY created_at DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}