const sequelize = require('../config/database');
const initModels = require('../models/init-models');

const models = initModels(sequelize);
const Appointments = models.appointments;
const Users = models.users; // Assuming you have a users model

module.exports = {
  // Get all appointments with user details
  findAll: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        date, 
        hostName, 
        treatment,
        status 
      } = req.query;

      const offset = (page - 1) * limit;
      
      // Build where conditions
      let whereConditions = {};
      let hostWhereConditions = {};
      let doctorWhereConditions = {};

      // Filter by date
      if (date) {
        whereConditions.date = {
          [sequelize.Sequelize.Op.like]: `%${date}%`
        };
      }

      // Filter by treatment
      if (treatment) {
        whereConditions.treatment_type = {
          [sequelize.Sequelize.Op.like]: `%${treatment}%`
        };
      }

      // Filter by status
      if (status) {
        whereConditions.status = status;
      }

      // Filter by host name
      if (hostName) {
        hostWhereConditions = {
          [sequelize.Sequelize.Op.or]: [
            { first_name: { [sequelize.Sequelize.Op.like]: `%${hostName}%` } },
            { last_name: { [sequelize.Sequelize.Op.like]: `%${hostName}%` } },
            sequelize.where(
              sequelize.fn('CONCAT', sequelize.col('host_user.first_name'), ' ', sequelize.col('host_user.last_name')),
              { [sequelize.Sequelize.Op.like]: `%${hostName}%` }
            )
          ]
        };
      }

      const appointments = await Appointments.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Users,
            as: 'host_user', // Alias for host user
            attributes: ['user_id', 'first_name', 'last_name', 'email'],
            where: hostWhereConditions,
            required: true
          },
          {
            model: Users,
            as: 'doctor_user', // Alias for doctor user
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'specialization'],
            where: doctorWhereConditions,
            required: true
          }
        ],
        order: [['created_date', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Map the data to match frontend expectations
      const mappedAppointments = appointments.rows.map(appointment => ({
        bookingId: appointment.appointment_id,
        userName: `${appointment.host_user.first_name} ${appointment.host_user.last_name}`,
        doctorName: `Dr. ${appointment.doctor_user.first_name} ${appointment.doctor_user.last_name}`,
        date: appointment.date,
        time: appointment.time,
        treatment: appointment.treatment_type,
        status: appointment.status,
        amount: appointment.amount,
        city: appointment.city,
        description: appointment.description,
        hospital_address: appointment.hospital_address,
        hospital_latitude: appointment.hospital_latitude,
        hospital_longitude: appointment.hospital_longitude,
        specialization: appointment.specialization,
        hostEmail: appointment.host_user.email,
        doctorEmail: appointment.doctor_user.email,
        created_date: appointment.created_date,
        updated_date: appointment.updated_date
      }));

      res.json({
        success: true,
        data: mappedAppointments,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: appointments.count,
          total_pages: Math.ceil(appointments.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), appointments.count)
        }
      });

    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get single appointment by ID
  findOne: async (req, res) => {
    try {
      const { id } = req.params;

      const appointment = await Appointments.findByPk(id, {
        include: [
          {
            model: Users,
            as: 'host_user',
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone']
          },
          {
            model: Users,
            as: 'doctor_user',
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone', 'specialization']
          }
        ]
      });

      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          error: 'Appointment not found' 
        });
      }

      // Map the data to match frontend expectations
      const mappedAppointment = {
        bookingId: appointment.appointment_id,
        userName: `${appointment.host_user.first_name} ${appointment.host_user.last_name}`,
        doctorName: `Dr. ${appointment.doctor_user.first_name} ${appointment.doctor_user.last_name}`,
        date: appointment.date,
        time: appointment.time,
        treatment: appointment.treatment_type,
        status: appointment.status,
        amount: appointment.amount,
        city: appointment.city,
        description: appointment.description,
        hospital_address: appointment.hospital_address,
        hospital_latitude: appointment.hospital_latitude,
        hospital_longitude: appointment.hospital_longitude,
        specialization: appointment.specialization,
        hostDetails: {
          id: appointment.host_user.user_id,
          name: `${appointment.host_user.first_name} ${appointment.host_user.last_name}`,
          email: appointment.host_user.email,
          phone: appointment.host_user.phone
        },
        doctorDetails: {
          id: appointment.doctor_user.user_id,
          name: `Dr. ${appointment.doctor_user.first_name} ${appointment.doctor_user.last_name}`,
          email: appointment.doctor_user.email,
          phone: appointment.doctor_user.phone,
          specialization: appointment.doctor_user.specialization
        },
        created_date: appointment.created_date,
        updated_date: appointment.updated_date
      };

      res.json({
        success: true,
        data: mappedAppointment
      });

    } catch (error) {
      console.error('Error fetching appointment:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Update appointment status
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['ACCEPT', 'CANCELLED', 'CANCLE', 'COMPLETED', 'REJECT', 'REQUESTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status value'
        });
      }

      const updateData = {
        status: status,
        updated_by: 'admin', // or get from authenticated user
        updated_date: new Date().toISOString()
      };

      const [updatedRows] = await Appointments.update(updateData, {
        where: { appointment_id: id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Appointment not found'
        });
      }

      res.json({
        success: true,
        message: 'Appointment status updated successfully'
      });

    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  // Get appointment statistics
  getStats: async (req, res) => {
    try {
      const stats = await Appointments.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('appointment_id')), 'count']
        ],
        group: ['status']
      });

      const formattedStats = stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.dataValues.count);
        return acc;
      }, {});

      res.json({
        success: true,
        data: formattedStats
      });

    } catch (error) {
      console.error('Error fetching appointment statistics:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};
