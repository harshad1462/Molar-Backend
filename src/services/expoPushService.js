const axios = require('axios');

class ExpoPushService {
  /**
   * Send push notifications to multiple Expo devices
   * @param {Array} expoPushTokens - Array of Expo push tokens
   * @param {String} title - Notification title
   * @param {String} body - Notification body
   * @param {Object} data - Additional data payload
   * @returns {Object} Result object with success status
   */
  async sendExpoPushNotification(expoPushTokens, title, body, data = {}) {
    try {
      console.log(`📤 Sending notifications to ${expoPushTokens.length} devices...`);

      // Filter valid Expo tokens
      const validTokens = expoPushTokens.filter(token => 
        token && typeof token === 'string' && token.startsWith('ExponentPushToken')
      );

      if (validTokens.length === 0) {
        console.log('⚠️ No valid Expo push tokens found');
        return { 
          success: false, 
          error: 'No valid Expo tokens',
          successCount: 0,
          failureCount: expoPushTokens.length
        };
      }

      // Create notification messages
      const messages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        priority: 'high',
        channelId: 'default',
        badge: 1,
        _displayInForeground: true
      }));

      // Send to Expo Push Notification Service
      const response = await axios.post(
        'https://exp.host/--/api/v2/push/send',
        messages,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('✅ Expo Push Notifications sent successfully');
      console.log(`Response:`, response.data);

      return { 
        success: true, 
        data: response.data,
        successCount: validTokens.length,
        failureCount: 0
      };

    } catch (error) {
      console.error('❌ Expo Push Notification Error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      
      return { 
        success: false, 
        error: error.message,
        successCount: 0,
        failureCount: expoPushTokens.length
      };
    }
  }

  /**
   * Send notification to single device
   */
  async sendToDevice(expoPushToken, title, body, data = {}) {
    return this.sendExpoPushNotification([expoPushToken], title, body, data);
  }

  /**
   * Send test notification
   */
  async sendTestNotification(expoPushToken) {
    return this.sendToDevice(
      expoPushToken,
      '🔔 Test Notification',
      'This is a test notification from MolarMap',
      { type: 'TEST' }
    );
  }
}

module.exports = new ExpoPushService();
