const express = require('express');
const app = express();
const initModels = require('./models/init-models');
const Sequelize = require('sequelize');

// DB connection setup:
const sequelize = new Sequelize('molarmap', 'root', 'root', {
  host: 'localhost',
  dialect: 'mysql',
});

const models = initModels(sequelize);

app.use(express.json());

// Import routes
const groupCodeRoutes = require('./routes/groupCodeRoutes');
const codeAttributesRoutes = require('./routes/codeAttributesRoutes');

// Use routes
app.use('/api/group-codes', groupCodeRoutes);
app.use('/api/code-attributes', codeAttributesRoutes);

const PORT = process.env.PORT || 3000;

// Test DB connection and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log('Error: ' + err));
