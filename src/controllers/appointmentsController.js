const sequelize = require('../config/database');
const initModels = require('../models/init-models');
const { Op } = require('sequelize');

const models = initModels(sequelize);
const Appointments = models.appointments;
const Users = models.users;

module.exports = {
  // Get all appointments with user details and filtering
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

      // Filter by date - FIXED: Use Op.eq instead of Op.like for DATEONLY fields [web:131][web:132]
      if (date) {
        try {
          // Decode URL-encoded date and format properly [web:134][web:144]
          const decodedDate = decodeURIComponent(date);
          // Ensure proper date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(decodedDate)) {
            whereConditions.date = {
              [Op.eq]: decodedDate // Use Op.eq for exact date match
            };
          } else {
            // If not exact date format, use partial matching on string representation
            whereConditions.date = {
              [Op.like]: `%${decodedDate}%`
            };
          }
        } catch (error) {
          // If decoding fails, use the original date
          console.warn('Date decoding failed, using original:', date);
          whereConditions.date = {
            [Op.like]: `%${date}%`
          };
        }
      }

      // Filter by treatment
      if (treatment) {
        whereConditions.treatment_type = {
          [Op.like]: `%${decodeURIComponent(treatment)}%`
        };
      }

      // Filter by status
      if (status) {
        whereConditions.status = decodeURIComponent(status);
      }

      // Filter by host name
      if (hostName) {
        hostWhereConditions = {
          name: { [Op.like]: `%${decodeURIComponent(hostName)}%` }
        };
      }

      const appointmentData = await Appointments.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Users,
            as: 'host_user', 
            attributes: ['user_id', 'name', 'email'],
            where: Object.keys(hostWhereConditions).length > 0 ? hostWhereConditions : undefined
          },
          {
            model: Users,
            as: 'doctor_user',
            attributes: ['user_id', 'name', 'email', 'specialization']
          }
        ],
        order: [['created_date', 'DESC']], 
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      // Map the data to match frontend expectations
      const mappedAppointments = appointmentData.rows.map(appointment => ({
        bookingId: appointment.appointment_id,
        userName: appointment.host_user?.name || 'Unknown',
        doctorName: `Dr. ${appointment.doctor_user?.name || 'Unknown'}`,
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
        hostEmail: appointment.host_user?.email,
        doctorEmail: appointment.doctor_user?.email,
        created_date: appointment.created_date,
        updated_date: appointment.updated_date
      }));

      res.json({
        success: true,
        data: mappedAppointments,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: appointmentData.count,
          total_pages: Math.ceil(appointmentData.count / limit),
          from: offset + 1,
          to: Math.min(offset + parseInt(limit), appointmentData.count)
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
            attributes: ['user_id', 'name', 'email', 'phone_number']
          },
          {
            model: Users,
            as: 'doctor_user',
            attributes: ['user_id', 'name', 'email', 'phone_number', 'specialization']
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
        userName: appointment.host_user?.name || 'Unknown',
        doctorName: `Dr. ${appointment.doctor_user?.name || 'Unknown'}`,
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
          id: appointment.host_user?.user_id,
          name: appointment.host_user?.name,
          email: appointment.host_user?.email,
          phone: appointment.host_user?.phone_number
        },
        doctorDetails: {
          id: appointment.doctor_user?.user_id,
          name: `Dr. ${appointment.doctor_user?.name}`,
          email: appointment.doctor_user?.email,
          phone: appointment.doctor_user?.phone_number,
          specialization: appointment.doctor_user?.specialization
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
  }
};
