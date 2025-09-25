const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const models = initModels(sequelize);
const CaseStudies = models.case_studies;
const CaseStudyImages = models.case_study_images;
const CaseStudyPdfs = models.case_study_pdfs;
const Users = models.users;

module.exports = {
  // Get all case studies with pagination and search
  findAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      let searchParams = [];
      
      if (search) {
        const searchTerm = decodeURIComponent(search);
        whereClause = 'WHERE (u.name LIKE ? OR cs.created_by LIKE ?)';
        searchParams = [`%${searchTerm}%`, `%${searchTerm}%`];
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT cs.case_study_id) as total
        FROM case_studies cs
        LEFT JOIN users u ON cs.user_id = u.user_id
        ${whereClause}
      `;
      const [countResult] = await sequelize.query(countQuery, {
        replacements: searchParams,
        type: sequelize.QueryTypes.SELECT
      });
      
      const total = countResult.total;

      // Get paginated data
      const dataQuery = `
        SELECT 
          cs.*,
          u.user_id as user_user_id,
          u.name as user_name,
          u.email as user_email,
          (SELECT COUNT(*) FROM case_study_images csi WHERE csi.case_study_id = cs.case_study_id) as image_count,
          (SELECT COUNT(*) FROM case_study_pdfs csp WHERE csp.case_study_id = cs.case_study_id) as pdf_count,
          (SELECT pdf_url FROM case_study_pdfs csp WHERE csp.case_study_id = cs.case_study_id LIMIT 1) as first_pdf_url
        FROM case_studies cs
        LEFT JOIN users u ON cs.user_id = u.user_id
        ${whereClause}
        ORDER BY cs.created_date DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `;

      const caseStudies = await sequelize.query(dataQuery, {
        replacements: searchParams,
        type: sequelize.QueryTypes.SELECT
      });

      // Map the data to match frontend expectations
      const mappedCaseStudies = caseStudies.map(caseStudy => ({
        id: `MOLARC#${caseStudy.case_study_id}`,
        caseStudyId: caseStudy.case_study_id,
        postedBy: caseStudy.user_name || caseStudy.created_by || 'Unknown',
        postedByEmail: caseStudy.user_email,
        userId: caseStudy.user_id,
        hasImages: caseStudy.image_count > 0,
        hasPdf: caseStudy.pdf_count > 0,
        imageCount: caseStudy.image_count,
        pdfUrl: caseStudy.first_pdf_url,
        created_date: caseStudy.created_date,
        updated_date: caseStudy.updated_date
      }));

      res.json({
        success: true,
        data: mappedCaseStudies,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: total,
          total_pages: Math.ceil(total / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), total)
        }
      });

    } catch (error) {
      console.error('Error fetching case studies:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get single case study by ID
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const caseStudyQuery = `
        SELECT 
          cs.*,
          u.user_id as user_user_id,
          u.name as user_name,
          u.email as user_email
        FROM case_studies cs
        LEFT JOIN users u ON cs.user_id = u.user_id
        WHERE cs.case_study_id = ?
      `;

      const [caseStudy] = await sequelize.query(caseStudyQuery, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });

      if (!caseStudy) {
        return res.status(404).json({ 
          success: false, 
          error: 'Case study not found' 
        });
      }

      // Get images
      const imagesQuery = `SELECT image_url FROM case_study_images WHERE case_study_id = ?`;
      const images = await sequelize.query(imagesQuery, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });

      // Get PDFs
      const pdfsQuery = `SELECT pdf_url FROM case_study_pdfs WHERE case_study_id = ?`;
      const pdfs = await sequelize.query(pdfsQuery, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });

      // Map the data
      const mappedCaseStudy = {
        id: `MOLARC#${caseStudy.case_study_id}`,
        caseStudyId: caseStudy.case_study_id,
        postedBy: caseStudy.user_name || caseStudy.created_by || 'Unknown',
        postedByEmail: caseStudy.user_email,
        userId: caseStudy.user_id,
        images: images.map(img => img.image_url),
        pdfs: pdfs.map(pdf => pdf.pdf_url),
        created_date: caseStudy.created_date,
        updated_date: caseStudy.updated_date
      };

      res.json({
        success: true,
        data: mappedCaseStudy
      });

    } catch (error) {
      console.error('Error fetching case study:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Create new case study with file upload
  create: async (req, res) => {
    try {
      const { userId, createdBy = 'admin' } = req.body;

      // Validate required fields
      if (!userId) {
        if (req.files) {
          Object.values(req.files).flat().forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      // Check if user exists
      const user = await Users.findByPk(userId);
      if (!user) {
        if (req.files) {
          Object.values(req.files).flat().forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if files were uploaded
      if (!req.files || ((!req.files.images || req.files.images.length === 0) && (!req.files.pdf || req.files.pdf.length === 0))) {
        return res.status(400).json({
          success: false,
          error: 'At least one file (image or PDF) is required'
        });
      }

      // Start transaction
      const transaction = await sequelize.transaction();

      try {
        // Create case study record
        const newCaseStudy = await CaseStudies.create({
          user_id: parseInt(userId),
          created_by: createdBy,
          created_date: new Date(),
          updated_by: createdBy,
          updated_date: new Date()
        }, { transaction });

        // Handle image uploads using raw SQL
        if (req.files.images && req.files.images.length > 0) {
          for (const file of req.files.images) {
            const imageUrl = `/uploads/case-studies/images/${file.filename}`;
            await sequelize.query(
              'INSERT INTO case_study_images (case_study_id, image_url) VALUES (?, ?)',
              {
                replacements: [newCaseStudy.case_study_id, imageUrl],
                type: sequelize.QueryTypes.INSERT,
                transaction
              }
            );
          }
        }

        // Handle PDF uploads using raw SQL
        if (req.files.pdf && req.files.pdf.length > 0) {
          for (const file of req.files.pdf) {
            const pdfUrl = `/uploads/case-studies/pdfs/${file.filename}`;
            await sequelize.query(
              'INSERT INTO case_study_pdfs (case_study_id, pdf_url) VALUES (?, ?)',
              {
                replacements: [newCaseStudy.case_study_id, pdfUrl],
                type: sequelize.QueryTypes.INSERT,
                transaction
              }
            );
          }
        }

        // Commit transaction
        await transaction.commit();

        res.json({
          success: true,
          message: 'Case study created successfully',
          data: {
            id: `MOLARC#${newCaseStudy.case_study_id}`,
            caseStudyId: newCaseStudy.case_study_id,
            postedBy: user.name,
            userId: newCaseStudy.user_id
          }
        });

      } catch (error) {
        await transaction.rollback();
        
        // Clean up uploaded files on error
        if (req.files) {
          Object.values(req.files).flat().forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        
        throw error;
      }

    } catch (error) {
      console.error('Error creating case study:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Delete case study
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      // Find images and PDFs to delete files
      const images = await sequelize.query(
        'SELECT image_url FROM case_study_images WHERE case_study_id = ?',
        { replacements: [id], type: sequelize.QueryTypes.SELECT }
      );

      const pdfs = await sequelize.query(
        'SELECT pdf_url FROM case_study_pdfs WHERE case_study_id = ?',
        { replacements: [id], type: sequelize.QueryTypes.SELECT }
      );

      // Check if case study exists
      const caseStudy = await CaseStudies.findByPk(id);
      if (!caseStudy) {
        return res.status(404).json({
          success: false,
          error: 'Case study not found'
        });
      }

      const transaction = await sequelize.transaction();

      try {
        // Delete physical files
        images.forEach(image => {
          const filePath = path.join(__dirname, '../../public', image.image_url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });

        pdfs.forEach(pdf => {
          const filePath = path.join(__dirname, '../../public', pdf.pdf_url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });

        // Delete records using raw SQL
        await sequelize.query(
          'DELETE FROM case_study_images WHERE case_study_id = ?',
          { replacements: [id], type: sequelize.QueryTypes.DELETE, transaction }
        );

        await sequelize.query(
          'DELETE FROM case_study_pdfs WHERE case_study_id = ?',
          { replacements: [id], type: sequelize.QueryTypes.DELETE, transaction }
        );

        // Delete the case study
        await CaseStudies.destroy({
          where: { case_study_id: id },
          transaction
        });

        await transaction.commit();

        res.json({
          success: true,
          message: 'Case study deleted successfully'
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Error deleting case study:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get all users for dropdown
  getUsers: async (req, res) => {
    try {
      const users = await Users.findAll({
        attributes: ['user_id', 'name', 'email'],
        order: [['name', 'ASC']]
      });

      const mappedUsers = users.map(user => ({
        id: user.user_id,
        name: user.name,
        email: user.email,
        display: `${user.name} (${user.email})`
      }));

      res.json({
        success: true,
        data: mappedUsers
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};
