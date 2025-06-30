const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;

// PostgreSQL connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'new_employee_db',
  password: 'Password@12345',
  port: 5432,
});

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, DOC/DOCX files are allowed!'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create table if not exists
async function setupDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobapplications (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        parents_name VARCHAR(100),
        gender VARCHAR(10) NOT NULL,
        dob DATE NOT NULL,
        email VARCHAR(100) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        alternate_mobile VARCHAR(15),
        aadhaar VARCHAR(12),
        pan VARCHAR(10),
        marital_status VARCHAR(20),
        nationality VARCHAR(50) DEFAULT 'Indian',
        current_address TEXT NOT NULL,
        permanent_address TEXT NOT NULL,
        state VARCHAR(50) NOT NULL,
        city VARCHAR(50) NOT NULL,
        zipcode VARCHAR(10) NOT NULL,
        education JSONB,
        experience_status VARCHAR(20) NOT NULL,
        experience JSONB,
        job_role VARCHAR(100) NOT NULL,
        preferred_location VARCHAR(100),
        expected_salary NUMERIC(12, 2),
        notice_period VARCHAR(20),
        key_skills TEXT NOT NULL,
        certifications TEXT,
        resume_path VARCHAR(255),
        photo_path VARCHAR(255),
        id_proof_path VARCHAR(255),
        education_certificates VARCHAR(255)[],
        experience_certificates VARCHAR(255)[],
        reference_details JSONB,
        agree_terms BOOLEAN NOT NULL,
        signature VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database table created successfully!');
  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    client.release();
  }
}

// Routes
app.post('/submit-application', upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'educationCertificates', maxCount: 10 },
  { name: 'experienceCertificates', maxCount: 10 }
]), async (req, res) => {
  try {
    const formData = req.body;
    const files = req.files;

    // Make sure the uploads directory exists
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }

    // Process education data
    const educationData = [];
    if (formData.qualificationLevel && Array.isArray(formData.qualificationLevel)) {
      for (let i = 0; i < formData.qualificationLevel.length; i++) {
        educationData.push({
          qualificationLevel: formData.qualificationLevel[i],
          branch: formData.branch ? formData.branch[i] : null,
          institute: formData.institute ? formData.institute[i] : null,
          board: formData.board ? formData.board[i] : null,
          yearOfPassing: formData.yearOfPassing ? formData.yearOfPassing[i] : null,
          percentage: formData.percentage ? formData.percentage[i] : null
        });
      }
    }

    // Process experience data
    const experienceData = [];
    if (formData.companyName && Array.isArray(formData.companyName)) {
      for (let i = 0; i < formData.companyName.length; i++) {
        experienceData.push({
          companyName: formData.companyName[i],
          designation: formData.designation ? formData.designation[i] : null,
          yearsOfExperience: formData.yearsOfExperience ? formData.yearsOfExperience[i] : null,
          workLocation: formData.workLocation ? formData.workLocation[i] : null,
          lastSalary: formData.lastSalary ? formData.lastSalary[i] : null
        });
      }
    }

    // Process references
    const referencesData = [];
    if (formData.referenceName && Array.isArray(formData.referenceName)) {
      for (let i = 0; i < formData.referenceName.length; i++) {
        referencesData.push({
          name: formData.referenceName[i],
          relation: formData.relation ? formData.relation[i] : null,
          contact: formData.referenceContact ? formData.referenceContact[i] : null,
          email: formData.referenceEmail ? formData.referenceEmail[i] : null
        });
      }
    }

    // Process file paths
    const educationCertPaths = files.educationCertificates ? 
      files.educationCertificates.map(f => f.path) : [];
    const experienceCertPaths = files.experienceCertificates ? 
      files.experienceCertificates.map(f => f.path) : [];

    // Insert into database
    const query = `
      INSERT INTO jobapplications (
        full_name, parents_name, gender, dob, email, mobile, alternate_mobile,
        aadhaar, pan, marital_status, nationality, current_address, permanent_address,
        state, city, zipcode, education, experience_status, experience, job_role,
        preferred_location, expected_salary, notice_period, key_skills, certifications,
        resume_path, photo_path, id_proof_path, education_certificates, experience_certificates,
        reference_details, agree_terms, signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
      RETURNING id
    `;

    const values = [
      formData.fullName, formData.parentsName, formData.gender, formData.dob,
      formData.email, formData.mobile, formData.alternateMobile, formData.aadhaar,
      formData.pan, formData.maritalStatus, formData.nationality, formData.currentAddress,
      formData.permanentAddress, formData.state, formData.city, formData.zipcode,
      educationData.length ? JSON.stringify(educationData) : null,
      formData.experienceStatus,
      experienceData.length ? JSON.stringify(experienceData) : null,
      formData.jobRole, formData.preferredLocation, formData.expectedSalary,
      formData.noticePeriod, formData.keySkills, formData.certifications,
      files.resume ? files.resume[0].path : null,
      files.photo ? files.photo[0].path : null,
      files.idProof ? files.idProof[0].path : null,
      educationCertPaths.length ? educationCertPaths : null,
      experienceCertPaths.length ? experienceCertPaths : null,
      referencesData.length ? JSON.stringify(referencesData) : null,
      formData.agreeTerms === 'on',
      formData.signature
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: error.stack // Remove this in production
    });
  }
});

// HR Dashboard Route
app.get('/hr-dashboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, mobile, job_role, 
             experience_status, created_at
      FROM jobapplications
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get applicant details
app.get('/applicant/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM jobapplications WHERE id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    
    const applicant = result.rows[0];
    // Parse JSON fields
    applicant.education = applicant.education ? JSON.parse(applicant.education) : [];
    applicant.experience = applicant.experience ? JSON.parse(applicant.experience) : [];
    applicant.reference_details = applicant.reference_details ? JSON.parse(applicant.reference_details) : [];
    
    res.json(applicant);
  } catch (error) {
    console.error('Error fetching applicant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download file
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Initialize database and start server
setupDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});