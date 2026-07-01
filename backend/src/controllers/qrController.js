import crypto from 'crypto';
import QRCodeLib from 'qrcode';
import prisma from '../utils/db.js';
import { processAttendanceScan } from '../utils/attendanceHelper.js';

const SECRET_KEY = process.env.JWT_SECRET || 'attendance_secret_hash_key_123';

// Generate safe HMAC signature token
export const generateSecureToken = (staffId) => {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(staffId);
  return `${staffId}.${hmac.digest('hex')}`;
};

// Validate signature token
export const verifySecureToken = (token) => {
  try {
    const [staffId, signature] = token.split('.');
    if (!staffId || !signature) return null;

    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(staffId);
    const expectedSignature = hmac.digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return staffId;
    }
  } catch (err) {
    return null;
  }
  return null;
};

const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

// GET /api/qrcode/generate/:staffId
export const generateQRCode = async (req, res) => {
  const { staffId } = req.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { staffId }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Generate secure token
    const token = generateSecureToken(staffId);

    // Look for existing active QR code token in database
    let qrRecord = await prisma.employeeQRCode.findUnique({
      where: { qrToken: token }
    });

    if (!qrRecord) {
      // Invalidate old QR codes for safety
      await prisma.employeeQRCode.updateMany({
        where: { staffId },
        data: { isActive: false }
      });

      // Save new active QR token
      qrRecord = await prisma.employeeQRCode.create({
        data: {
          staffId,
          qrToken: token,
          isActive: true
        }
      });
    }

    // Generate QR base64 image
    const qrImage = await QRCodeLib.toDataURL(token);

    res.json({
      success: true,
      qrToken: token,
      qrImage
    });
  } catch (error) {
    console.error('QR generate error:', error);
    res.status(500).json({ message: 'Server error generating QR code' });
  }
};

// POST /api/qrcode/scan
export const scanQRCode = async (req, res) => {
  const { qrToken, deviceInfo, location, latitude, longitude } = req.body;

  if (!qrToken) {
    return res.status(400).json({ message: 'QR token is required' });
  }

  try {
    // 1. Verify token signature
    const staffId = verifySecureToken(qrToken);
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Invalid QR signature or corrupted data' });
    }

    // Verify employee branch settings match coordinates
    const employee = await prisma.employee.findUnique({
      where: { staffId }
    });

    if (!employee) {
      return res.status(400).json({ success: false, message: 'Employee not found' });
    }

    const settingsList = await prisma.kioskSetting.findMany();
    if (settingsList.length > 0) {
      if (
        latitude === undefined || 
        longitude === undefined || 
        latitude === null || 
        longitude === null || 
        isNaN(parseFloat(latitude)) || 
        isNaN(parseFloat(longitude))
      ) {
        return res.status(400).json({
          success: false,
          message: 'Location data (GPS) is required to check-in. សូមបើក Location (GPS) លើឧបករណ៍របស់អ្នក។'
        });
      }

      const clientLat = parseFloat(latitude);
      const clientLng = parseFloat(longitude);
      
      // Parse assigned branches (comma-separated string)
      const employeeBranches = employee.branch
        ? employee.branch.split(',').map(b => b.trim().toLowerCase())
        : [];

      // Filter geofence zones matching employee's branch assignment
      const allowedSettingsList = settingsList.filter(setting =>
        employeeBranches.includes(setting.name.toLowerCase())
      );

      if (allowedSettingsList.length === 0) {
        return res.status(403).json({
          success: false,
          message: `គណនីរបស់អ្នកមិនទាន់ត្រូវបានកំណត់ឱ្យចុះវត្តមាននៅសាខាណាមួយឡើយ! (Employee is not assigned to any active branch settings).`
        });
      }

      let isInsideAnyZone = false;
      let closestZone = null;
      let minDistance = Infinity;

      for (const settings of allowedSettingsList) {
        const distance = getHaversineDistance(
          clientLat, 
          clientLng, 
          settings.latitude, 
          settings.longitude
        );
        if (distance <= settings.radius) {
          isInsideAnyZone = true;
          break;
        }
        const delta = distance - settings.radius;
        if (delta < minDistance) {
          minDistance = delta;
          closestZone = {
            name: settings.name,
            distance: Math.round(distance),
            radius: settings.radius
          };
        }
      }

      if (!isInsideAnyZone) {
        return res.status(403).json({
          success: false,
          message: closestZone 
            ? `ក្រៅទីតាំងអនុញ្ញាត! (Out of allowed zone). Closest branch "${closestZone.name}" is ${closestZone.distance}m away (limit is ${closestZone.radius}m).`
            : `ក្រៅទីតាំងអនុញ្ញាត! (Out of allowed zone).`
        });
      }
    }

    // 2. Query QR record from database to verify active status
    const qrRecord = await prisma.employeeQRCode.findUnique({
      where: { qrToken }
    });

    if (!qrRecord || !qrRecord.isActive) {
      // Failed log audit
      await prisma.attendanceLog.create({
        data: {
          staffId,
          method: 'qrcode',
          action: 'UNKNOWN',
          status: 'failed',
          deviceInfo: deviceInfo || 'Kiosk Scanner',
          location: location || 'HQ Lobby'
        }
      });

      return res.status(400).json({ success: false, message: 'This QR code is inactive or has been revoked' });
    }

    // 3. Process check-in
    const result = await processAttendanceScan({
      staffId,
      note: 'Auto scan: QR Code'
    });

    // 4. Create successful scan audit log
    await prisma.attendanceLog.create({
      data: {
        staffId,
        method: 'qrcode',
        action: result.action,
        status: 'success',
        deviceInfo: deviceInfo || 'Kiosk Scanner',
        location: location || 'HQ Lobby'
      }
    });

    res.json({
      success: true,
      message: `Checked in Sok! Action: ${result.action}`,
      employee: {
        staffId: result.attendance.employee.staffId,
        nameEn: result.attendance.employee.nameEn,
        nameKh: result.attendance.employee.nameKh,
        department: result.attendance.employee.department.nameEn
      },
      action: result.action,
      timeString: result.timeString
    });
  } catch (error) {
    console.error('QR Scan error:', error);
    res.status(500).json({ message: 'Server error scanning QR code' });
  }
};
