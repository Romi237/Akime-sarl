const AuditLog = require('../models/AuditLog');

const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    let responseSent = false;

    // Override res.send to capture the response
    res.send = function (data) {
      if (!responseSent) {
        responseSent = true;
        // Only log if request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Parse response data if it's JSON
          let parsedData;
          try {
            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          } catch (e) {
            parsedData = data;
          }

          // Create audit log entry
          const logEntry = new AuditLog({
            user: req.user?.id,
            action,
            resource,
            resourceId: req.params?.id || parsedData?.data?._id || null,
            details: {
              requestBody: req.body,
              responseStatus: res.statusCode
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
          });

          // Save log asynchronously without blocking response
          logEntry.save().catch(err => console.error('Audit log save error:', err));
        }
        originalSend.call(this, data);
      }
    };

    next();
  };
};

module.exports = auditLog;
