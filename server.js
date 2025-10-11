const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const firebase = require('./src/config/firebase');

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:19006', // Expo development server
    'http://10.0.2.2:3000', // Android emulator
    'http://localhost:8081'], // Add your frontend URLs
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));


const sequelize = require('./src/config/database');
const initModels = require('./src/models/init-models');

// Initialize models
const models = initModels(sequelize);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Import routes
const groupCodeRoutes = require('./src/routes/groupCodeRoutes');
const codeAttributesRoutes = require('./src/routes/codeAttributesRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const packageRoutes = require('./src/routes/packageRoutes');
const userRoutes = require('./src/routes/userRoutes')
const subscriberRoutes = require('./src/routes/subscribersRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const couponRoutes = require('./src/routes/couponRoutes')
const caseStudyRoutes = require('./src/routes/caseStudyRoutes')
const reviewRoutes = require('./src/routes/reviewRoutes');
const adminRoutes= require('./src/routes/adminRoutes');
const internRoutes = require("./src/routes/internRoutes");
const consultantRoutes= require('./src/routes/consultantRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const clinicRoutes = require('./src/routes/clinicRoutes');
const requestRoutes = require('./src/routes/requestsRoutes');
const paymentRoutes = require('./src/routes/payment')
const fcmRoutes = require('./src/routes/fcm');
const hostRoutes=require('./src/routes/hostRoutes');
// Use routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/group-codes', groupCodeRoutes);
app.use('/api/code-attributes', codeAttributesRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/case-studies', caseStudyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/intern', internRoutes);
app.use('/api/consultants', consultantRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/host',hostRoutes);
const PORT = process.env.PORT || 3000;

// Test DB connection and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => console.log(`Server running on  http://localhost:${PORT}`));
  })
  .catch(err => console.error('DB connection error:', err));
