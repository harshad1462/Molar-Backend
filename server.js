const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:5173',  // frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const sequelize = require('./src/config/database');
const initModels = require('./src/models/init-models');

// Initialize models
const models = initModels(sequelize);

app.use(express.json());

// Import routes
const groupCodeRoutes = require('./src/routes/groupCodeRoutes');
const codeAttributesRoutes = require('./src/routes/codeAttributesRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');


// Use routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/group-codes', groupCodeRoutes);
app.use('/api/code-attributes', codeAttributesRoutes);

const PORT = process.env.PORT || 3000;

// Test DB connection and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('DB connection error:', err));
