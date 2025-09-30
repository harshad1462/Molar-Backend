const sequelize = require('../config/database');
const initModels = require('../models/init-models');

const models = initModels(sequelize);
const Packages = models.packages;

module.exports = {
  // 1. Get all subscription plans
  findAll: async (req, res) => {
    try {
      const packages = await Packages.findAll({
        order: [['created_date', 'DESC']]
      });
      res.json(packages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. Get single package by ID
  findOne: async (req, res) => {
    try {
      const id = req.params.id;
      const package = await Packages.findByPk(id);
      if (!package) return res.status(404).json({ error: 'Package not found' });
      res.json(package);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 3. Create new subscription package
  create: async (req, res) => {
    try {
      const dataToCreate = {
        ...req.body,
        created_by: 'admin',
        created_date: new Date(),
        updated_date: new Date(),
        updated_by: 'admin',
        status: req.body.status !== undefined ? req.body.status : 1,
        total_subscribers: 0
      };
      const newPackage = await Packages.create(dataToCreate);
      res.status(201).json(newPackage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 4. Update subscription package
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const dataToUpdate = {
        ...req.body,
        updated_date: new Date(),
        updated_by: 'admin'
      };
      const updated = await Packages.update(dataToUpdate, { 
        where: { package_id: id } 
      });
      if (updated[0] === 0) {
        return res.status(404).json({ error: 'Package not found' });
      }
      const updatedPackage = await Packages.findByPk(id);
      res.json(updatedPackage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 5. Change status (active/inactive) - THIS IS THE MAIN ONE YOU NEED
  updateStatus: async (req, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body;
      
      // Validate status
      if (status !== 0 && status !== 1) {
        return res.status(400).json({ error: 'Status must be 0 (inactive) or 1 (active)' });
      }

      const dataToUpdate = {
        status: status,
        updated_date: new Date(),
        updated_by: 'admin'
      };
      
      const updated = await Packages.update(dataToUpdate, { 
        where: { package_id: id } 
      });
      
      if (updated[0] === 0) {
        return res.status(404).json({ error: 'Package not found' });
      }
      
      const updatedPackage = await Packages.findByPk(id);
      res.json(updatedPackage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

    // 6. Final Delete Controller - Simple Logic
  delete: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const id = req.params.id;
      const force = req.query.force === 'true';
      
      // Validate ID
      if (!id || isNaN(id)) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Invalid package ID' 
        });
      }
      
      // Check if package exists
      const existingPackage = await Packages.findByPk(id, { transaction });
      if (!existingPackage) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false,
          error: 'Package not found' 
        });
      }

      // Count active subscribers only (status = 'ACTIVE' AND end_date > NOW())
      const activeSubscriberCount = await sequelize.query(`
        SELECT COUNT(*) as active_count
        FROM subscribers 
        WHERE package_id = :packageId 
        AND status = 'ACTIVE' 
        AND end_date > NOW()
      `, {
        replacements: { packageId: id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      // Total subscribers count  
      const totalSubscriberCount = await sequelize.query(`
        SELECT COUNT(*) as total_count
        FROM subscribers 
        WHERE package_id = :packageId
      `, {
        replacements: { packageId: id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      const activeCount = parseInt(activeSubscriberCount[0].active_count) || 0;
      const totalCount = parseInt(totalSubscriberCount[0].total_count) || 0;

      console.log(`Package "${existingPackage.package_name}" - Active: ${activeCount}, Total: ${totalCount}`);

      // SIMPLE RULE: If no active subscribers, allow deletion
      if (activeCount === 0) {
        
        // Delete all subscribers (expired/inactive) first
        if (totalCount > 0) {
          await sequelize.query(
            'DELETE FROM subscribers WHERE package_id = :packageId',
            {
              replacements: { packageId: id },
              type: sequelize.QueryTypes.DELETE,
              transaction
            }
          );
        }

        // Delete the package
        await Packages.destroy({ 
          where: { package_id: id },
          transaction
        });
        
        await transaction.commit();
        
        return res.json({ 
          success: true,
          message: totalCount > 0 
            ? `Package "${existingPackage.package_name}" and ${totalCount} expired/inactive subscribers deleted successfully`
            : `Package "${existingPackage.package_name}" deleted successfully`,
          details: {
            deleted_package: existingPackage.package_name,
            subscribers_deleted: totalCount,
            active_subscribers: 0
          }
        });
      }

      // Has active subscribers - prevent deletion unless force
      if (!force) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Cannot delete package "${existingPackage.package_name}" because it has ${activeCount} active subscribers.`,
          details: {
            package_name: existingPackage.package_name,
            active_subscribers: activeCount,
            total_subscribers: totalCount,
            suggestion: 'Wait for subscriptions to expire or deactivate the package.'
          },
          can_force_delete: true
        });
      }

      // Force delete - remove ALL subscribers including active ones
      if (totalCount > 0) {
        await sequelize.query(
          'DELETE FROM subscribers WHERE package_id = :packageId',
          {
            replacements: { packageId: id },
            type: sequelize.QueryTypes.DELETE,
            transaction
          }
        );
      }

      await Packages.destroy({ 
        where: { package_id: id },
        transaction
      });
      
      await transaction.commit();
      
      return res.json({ 
        success: true,
        message: `Package "${existingPackage.package_name}" FORCE DELETED with ${totalCount} subscribers`,
        details: {
          deleted_package: existingPackage.package_name,
          subscribers_deleted: totalCount,
          active_terminated: activeCount,
          warning: activeCount > 0 ? `${activeCount} active subscriptions were terminated!` : null
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      console.error('Error in delete package:', error);
      
      // Handle foreign key constraint error
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete package due to active subscribers.',
          can_force_delete: true
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete package',
        message: error.message 
      });
    }
  },

      // NEW METHOD 1: Get available packages for mobile app (with discount calculation)
  getAvailablePackages: async (req, res) => {
    try {
      // Get only active packages
      const packages = await Packages.findAll({
        where: { status: 1 }, // Only active packages
        attributes: [
          'package_id',
          'package_name',
          'price',
          'duration_days',
          'features'
        ],
        order: [['price', 'ASC']]
      });

      // Helper function to generate random discount percentage (25-40%)
      const getRandomDiscount = () => 25 + Math.floor(Math.random() * 16);

      const formattedPackages = packages.map(pkg => {
        const sellPrice = Number(pkg.price);
        const discountPercent = getRandomDiscount(); // 25-40%
        const mrp = Math.round(sellPrice / (1 - discountPercent / 100)); // Calculate MRP
        const actualSavePercent = Math.round(((mrp - sellPrice) / mrp) * 100);

        // Parse features from comma-separated text to array
        const featuresArray = (pkg.features || '')
          .split(',')
          .map(feature => feature.trim())
          .filter(feature => feature.length > 0);

        return {
          id: pkg.package_id,
          name: pkg.package_name,
          sellPrice: sellPrice,
          mrp: mrp,
          savePercent: actualSavePercent,
          currency: '₹',
          duration: pkg.duration_days,
          features: featuresArray,
          // Add flags for UI styling
          popular: sellPrice >= 1000 && sellPrice <= 2000,
          recommended: pkg.duration_days >= 180,
          mostPopular: pkg.duration_days >= 150 && pkg.duration_days <= 200
        };
      });

      res.json({
        success: true,
        packages: formattedPackages
      });

    } catch (error) {
      console.error('Error fetching available packages:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // NEW METHOD 2: Get single package for mobile app (with discount)
  getPackageForApp: async (req, res) => {
    try {
      const packageId = req.params.id;

      const package = await Packages.findOne({
        where: { 
          package_id: packageId,
          status: 1 // Only active packages
        },
        attributes: [
          'package_id',
          'package_name',
          'price',
          'duration_days',
          'features'
        ]
      });

      if (!package) {
        return res.status(404).json({
          success: false,
          error: 'Package not found or inactive'
        });
      }

      const sellPrice = Number(package.price);
      const discountPercent = 30; // Fixed 30% for single package view
      const mrp = Math.round(sellPrice / (1 - discountPercent / 100));

      // Parse features
      const featuresArray = (package.features || '')
        .split(',')
        .map(feature => feature.trim())
        .filter(feature => feature.length > 0);

      const formattedPackage = {
        id: package.package_id,
        name: package.package_name,
        sellPrice: sellPrice,
        mrp: mrp,
        savePercent: discountPercent,
        currency: '₹',
        duration: package.duration_days,
        features: featuresArray
      };

      res.json({
        success: true,
        package: formattedPackage
      });

    } catch (error) {
      console.error('Error fetching package:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // NEW METHOD 3: Get packages summary (for dashboard stats)
  getPackagesSummary: async (req, res) => {
    try {
      const summary = await sequelize.query(`
        SELECT 
          COUNT(*) as total_packages,
          COUNT(CASE WHEN status = 1 THEN 1 END) as active_packages,
          COUNT(CASE WHEN status = 0 THEN 1 END) as inactive_packages,
          AVG(price) as average_price,
          MIN(price) as min_price,
          MAX(price) as max_price
        FROM packages
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      const packageStats = summary[0];

      res.json({
        success: true,
        summary: {
          totalPackages: parseInt(packageStats.total_packages),
          activePackages: parseInt(packageStats.active_packages),
          inactivePackages: parseInt(packageStats.inactive_packages),
          averagePrice: Math.round(packageStats.average_price || 0),
          minPrice: packageStats.min_price || 0,
          maxPrice: packageStats.max_price || 0
        }
      });

    } catch (error) {
      console.error('Error fetching packages summary:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

};
