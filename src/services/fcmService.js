const admin = require('firebase-admin');
const path = require('path');
const sequelize = require('../config/database');
const initModels = require('../models/init-models');

// Initialize models
const models = initModels(sequelize);
const User = models.users;

// Initialize Firebase Admin SDK (only if not already initialized)
let serviceAccount;
try {
  serviceAccount = require(path.join(__dirname, '../config/serviceAccountKey.json'));
} catch (error) {
  console.error('❌ Error loading serviceAccountKey.json:', error.message);
  console.error('Make sure serviceAccountKey.json exists in backend/config/');
}

// ✅ FIX: Check if Firebase app already exists before initializing
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  }
} else {
  console.log('✅ Firebase Admin SDK already initialized');
}

class FCMService {
  // Send notification to multiple devices
  async sendMulticastNotification(fcmTokens, title, body, data = {}) {
    try {
      if (!fcmTokens || fcmTokens.length === 0) {
        console.log('⚠️ No FCM tokens provided');
        return { success: false, error: 'No tokens' };
      }

      // Filter out invalid tokens
      const validTokens = fcmTokens.filter(token => 
        token && typeof token === 'string' && token.length > 20
      );

      if (validTokens.length === 0) {
        console.log('⚠️ No valid FCM tokens found');
        return { success: false, error: 'No valid tokens' };
      }

      console.log(`📤 Sending notifications to ${validTokens.length} devices...`);

      const message = {
        notification: {
          title: title,
          body: body
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        tokens: validTokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
            priority: 'high',
            defaultVibrateTimings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true
            }
          },
          headers: {
            'apns-priority': '10'
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`✅ Notifications sent: ${response.successCount}/${validTokens.length}`);
      
      if (response.failureCount > 0) {
        console.log(`❌ Failed: ${response.failureCount}`);
        
        // Log failed tokens for debugging
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.log(`Failed token ${idx + 1}:`, resp.error?.code, resp.error?.message);
          }
        });
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses,
        totalTokens: validTokens.length
      };
    } catch (error) {
      console.error('❌ FCM Multicast Error:', error.message);
      return { 
        success: false, 
        error: error.message,
        successCount: 0,
        failureCount: fcmTokens?.length || 0
      };
    }
  }

  // Send to single device
  async sendNotification(fcmToken, title, body, data = {}) {
    try {
      if (!fcmToken || typeof fcmToken !== 'string') {
        console.log('⚠️ Invalid FCM token provided');
        return { success: false, error: 'Invalid token' };
      }

      console.log(`📤 Sending notification to single device...`);

      const message = {
        notification: { title, body },
        data: { ...data, timestamp: new Date().toISOString() },
        token: fcmToken,
        android: {
          priority: 'high',
          notification: { 
            sound: 'default',
            channelId: 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Single notification sent:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ FCM Single Send Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send notifications to doctors by user IDs
  async sendToDoctors(doctorUserIds, title, body, data = {}) {
    try {
      console.log(`📱 Fetching FCM tokens for ${doctorUserIds.length} doctors...`);

      // Get FCM tokens for all doctor user IDs
      const doctors = await User.findAll({
        where: {
          user_id: doctorUserIds,
          fcm_token: { [require('sequelize').Op.ne]: null }
        },
        attributes: ['user_id', 'name', 'fcm_token']
      });

      console.log(`✅ Found ${doctors.length} doctors with FCM tokens`);

      if (doctors.length === 0) {
        console.log('⚠️ No doctors have FCM tokens registered');
        return {
          success: false,
          error: 'No doctors with FCM tokens found',
          totalDoctors: 0,
          successCount: 0,
          failureCount: 0
        };
      }

      // Extract FCM tokens
      const fcmTokens = doctors.map(doctor => doctor.fcm_token);

      console.log('📤 Sending notifications...');
      console.log(`Title: ${title}`);
      console.log(`Body: ${body}`);
      console.log(`Data:`, data);

      // Send notifications
      const result = await this.sendMulticastNotification(
        fcmTokens,
        title,
        body,
        data
      );

      return {
        success: result.success,
        totalDoctors: doctors.length,
        successCount: result.successCount || 0,
        failureCount: result.failureCount || 0,
        responses: result.responses,
        doctors: doctors.map(d => ({
          user_id: d.user_id,
          name: d.name
        }))
      };

    } catch (error) {
      console.error('❌ Error sending to doctors:', error);
      return {
        success: false,
        error: error.message,
        totalDoctors: 0,
        successCount: 0,
        failureCount: 0
      };
    }
  }

  // Send notification to specific user by ID
  async sendToUser(userId, title, body, data = {}) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['user_id', 'name', 'fcm_token']
      });

      if (!user || !user.fcm_token) {
        console.log(`⚠️ User ${userId} has no FCM token`);
        return {
          success: false,
          error: 'User has no FCM token registered'
        };
      }

      return await this.sendNotification(user.fcm_token, title, body, data);

    } catch (error) {
      console.error('❌ Error sending to user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test notification (for debugging)
  async sendTestNotification(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['user_id', 'name', 'fcm_token']
      });

      if (!user || !user.fcm_token) {
        return {
          success: false,
          error: 'User not found or no FCM token'
        };
      }

      const result = await this.sendNotification(
        user.fcm_token,
        '🔔 Test Notification',
        'This is a test notification from MolarMap',
        {
          type: 'TEST',
          timestamp: new Date().toISOString()
        }
      );

      return {
        success: result.success,
        user_id: user.user_id,
        user_name: user.name,
        message: result.success ? 'Test notification sent' : 'Failed to send'
      };

    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if Firebase Admin is initialized
  isInitialized() {
    return admin.apps.length > 0;
  }

  // Get Firebase app instance
  getApp() {
    return admin.app();
  }
}

module.exports = new FCMService();
