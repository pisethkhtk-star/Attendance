import prisma from '../utils/db.js';
import { processAttendanceScan } from '../utils/attendanceHelper.js';

// Calculate Euclidean distance between two vectors
const getEuclideanDistance = (v1, v2) => {
  if (!v1 || !v2 || v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
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

// POST /api/face/enroll
export const enrollFace = async (req, res) => {
  const { staffId, faceDescriptor, photoUrl } = req.body;

  if (!staffId || !faceDescriptor) {
    return res.status(400).json({ message: 'Staff ID and face descriptor are required' });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { staffId }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee already has face data, if so, delete it or add another template
    // The requirement says: "generate descriptor -> រក្សាទុកក្នុង employee_face_data"
    // We can delete previous templates and store the new template to keep it simple,
    // or allow multiple templates. Let's delete existing templates first to avoid duplicates.
    await prisma.employeeFaceData.deleteMany({
      where: { staffId }
    });

    const faceData = await prisma.employeeFaceData.create({
      data: {
        staffId,
        faceDescriptor, // Store Json (Float32Array converted to standard number array)
        photoUrl
      }
    });

    res.status(201).json({
      message: 'Face coordinates registered successfully',
      data: faceData
    });
  } catch (error) {
    console.error('Face enroll error:', error);
    res.status(500).json({ message: 'Server error enrolling face' });
  }
};

// POST /api/face/checkin
export const verifyAndCheckInFace = async (req, res) => {
  const { faceDescriptor, deviceInfo, location, latitude, longitude } = req.body;

  if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
    return res.status(400).json({ message: 'Valid face descriptor array is required' });
  }

  try {
    // Geofencing limits check
    const settings = await prisma.kioskSetting.findFirst();
    if (settings) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Location data (GPS) is required to check-in. សូមបើក Location (GPS) លើឧបករណ៍របស់អ្នក។'
        });
      }

      const clientLat = parseFloat(latitude);
      const clientLng = parseFloat(longitude);
      
      const distance = getHaversineDistance(
        clientLat, 
        clientLng, 
        settings.latitude, 
        settings.longitude
      );

      if (distance > settings.radius) {
        return res.status(403).json({
          success: false,
          message: `ក្រៅទីតាំងអនុញ្ញាត! (Out of allowed zone). You are ${Math.round(distance)}m away. Allowed limit is ${settings.radius}m.`
        });
      }
    }
    // 1. Fetch all registered faces
    const enrolledFaces = await prisma.employeeFaceData.findMany({
      include: {
        employee: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    let bestMatch = null;
    let minDistance = 1.0; // standard face recognition threshold is 0.6

    for (const record of enrolledFaces) {
      if (record.employee.status !== 'Active') continue; // Skip inactive employees

      const distance = getEuclideanDistance(faceDescriptor, record.faceDescriptor);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = record;
      }
    }

    // Recognition threshold check
    const RECOGNITION_THRESHOLD = 0.55; 
    if (!bestMatch || minDistance > RECOGNITION_THRESHOLD) {
      // Log failed check-in attempt
      await prisma.attendanceLog.create({
        data: {
          staffId: 'UNKNOWN',
          method: 'face',
          action: 'UNKNOWN',
          status: 'failed',
          deviceInfo: deviceInfo || 'Kiosk Camera',
          location: location || 'HQ Entrance'
        }
      });

      return res.status(400).json({
        success: false,
        message: 'Face not recognized',
        distance: minDistance
      });
    }

    const staffId = bestMatch.staffId;

    // 2. Perform attendance scanning update
    const result = await processAttendanceScan({
      staffId,
      note: 'Auto scan: Face Recognition'
    });

    // 3. Create successful audit trail log
    await prisma.attendanceLog.create({
      data: {
        staffId,
        method: 'face',
        action: result.action,
        status: 'success',
        deviceInfo: deviceInfo || 'Kiosk Camera',
        location: location || 'HQ Entrance'
      }
    });

    res.json({
      success: true,
      message: `Recognized Sok! Scanned: ${result.action}`,
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
    console.error('Face check-in error:', error);
    res.status(500).json({ message: 'Server error processing face check-in' });
  }
};
