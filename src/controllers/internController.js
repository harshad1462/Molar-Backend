const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";
const internController = {
  // STEP 1: Verify and Send OTP
  verify: async (req, res) => {
    try {
      const User = req.app.get("models").users;
      const { name, email, qualification, specialization, phone } = req.body;

      if (!name || !email || !qualification || !specialization || !phone) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      // Check if user exists
      const existingUser = await User.findOne({
        where: {
    [Op.or]: [{ email }, { phone_number: phone }]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User already exists",
          role: existingUser.role
        });
      }

      // Always use default OTP = 1234
      internController.otpStore[email] = {
        otp: "1234",
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  userData: { name, email, qualification, specialization, phone_number: phone }
      };

      return res.json({
        success: true,
        message: "Default OTP is 1234 (valid for 5 min)",
        email
      });
    } catch (err) {
      console.error("Verify error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // STEP 2: Register with OTP
register: async (req, res) => {
  try {
    const User = req.app.get("models").users;
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const otpData = internController.otpStore[email];
    if (!otpData) {
      return res.status(400).json({ success: false, message: "No OTP found. Please verify first." });
    }

    if (Date.now() > otpData.expires) {
      delete internController.otpStore[email];
      return res.status(400).json({ success: false, message: "OTP expired. Please request again." });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Save user in DB
    const newUser = await User.create({
      ...otpData.userData,
      role: "INTERN",
      status: "ACTIVE",
      created_by: "system",
      created_date: new Date()
    });

    // Remove OTP after success
    delete internController.otpStore[email];

    // 🔑 Generate JWT
    const token = jwt.sign(
      {
        user_id: newUser.user_id,
        email: newUser.email,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      success: true,
      message: "Intern registered successfully",
      data: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone_number, // ✅ match DB field
        role: newUser.role
      },
      token // 🔑 include JWT
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
};

// Keep OTP store here
internController.otpStore = {};

module.exports = internController;
