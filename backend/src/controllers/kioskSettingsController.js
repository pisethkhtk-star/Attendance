import prisma from '../utils/db.js';

// GET /api/kiosk/settings
export const getKioskSettings = async (req, res) => {
  try {
    let settings = await prisma.kioskSetting.findFirst();
    
    if (!settings) {
      // Fallback fallback if seed didn't run
      settings = await prisma.kioskSetting.create({
        data: {
          latitude: 11.5564,
          longitude: 104.9282,
          radius: 100.0
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching kiosk settings:', error);
    res.status(500).json({ message: 'Server error loading geofence settings' });
  }
};

// PUT /api/kiosk/settings
export const updateKioskSettings = async (req, res) => {
  const { latitude, longitude, radius } = req.body;

  if (latitude === undefined || longitude === undefined || radius === undefined) {
    return res.status(400).json({ message: 'Latitude, longitude, and radius are required' });
  }

  try {
    let settings = await prisma.kioskSetting.findFirst();

    if (!settings) {
      settings = await prisma.kioskSetting.create({
        data: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius)
        }
      });
    } else {
      settings = await prisma.kioskSetting.update({
        where: { id: settings.id },
        data: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius)
        }
      });
    }

    res.json({ message: 'Kiosk geolocation settings updated successfully', data: settings });
  } catch (error) {
    console.error('Error updating kiosk settings:', error);
    res.status(500).json({ message: 'Server error saving geofence settings' });
  }
};
