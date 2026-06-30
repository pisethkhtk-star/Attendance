import prisma from './db.js';

export const initializePermissions = async () => {
  try {
    console.log('Initializing role permissions...');

    const defaultPermissions = [
      // Admin permissions
      { role: 'Admin', resource: 'departments', canAccess: true },
      { role: 'Admin', resource: 'positions', canAccess: true },
      { role: 'Admin', resource: 'employees', canAccess: true },
      { role: 'Admin', resource: 'attendance', canAccess: true },
      { role: 'Admin', resource: 'add_attendance', canAccess: true },
      { role: 'Admin', resource: 'edit_attendance', canAccess: true },
      { role: 'Admin', resource: 'delete_attendance', canAccess: true },
      { role: 'Admin', resource: 'leaves', canAccess: true },
      { role: 'Admin', resource: 'reports', canAccess: true },
      { role: 'Admin', resource: 'kiosk', canAccess: true },
      { role: 'Admin', resource: 'permissions', canAccess: true },

      // HR permissions
      { role: 'HR', resource: 'departments', canAccess: true },
      { role: 'HR', resource: 'positions', canAccess: true },
      { role: 'HR', resource: 'employees', canAccess: true },
      { role: 'HR', resource: 'attendance', canAccess: true },
      { role: 'HR', resource: 'add_attendance', canAccess: true },
      { role: 'HR', resource: 'edit_attendance', canAccess: true },
      { role: 'HR', resource: 'delete_attendance', canAccess: true },
      { role: 'HR', resource: 'leaves', canAccess: true },
      { role: 'HR', resource: 'reports', canAccess: true },
      { role: 'HR', resource: 'kiosk', canAccess: true },
      { role: 'HR', resource: 'permissions', canAccess: false },

      // Manager permissions
      { role: 'Manager', resource: 'departments', canAccess: false },
      { role: 'Manager', resource: 'positions', canAccess: false },
      { role: 'Manager', resource: 'employees', canAccess: true },
      { role: 'Manager', resource: 'attendance', canAccess: true },
      { role: 'Manager', resource: 'add_attendance', canAccess: false },
      { role: 'Manager', resource: 'edit_attendance', canAccess: false },
      { role: 'Manager', resource: 'delete_attendance', canAccess: false },
      { role: 'Manager', resource: 'leaves', canAccess: true },
      { role: 'Manager', resource: 'reports', canAccess: true },
      { role: 'Manager', resource: 'kiosk', canAccess: true },
      { role: 'Manager', resource: 'permissions', canAccess: false },

      // Employee permissions
      { role: 'Employee', resource: 'departments', canAccess: false },
      { role: 'Employee', resource: 'positions', canAccess: false },
      { role: 'Employee', resource: 'employees', canAccess: false },
      { role: 'Employee', resource: 'attendance', canAccess: true },
      { role: 'Employee', resource: 'add_attendance', canAccess: false },
      { role: 'Employee', resource: 'edit_attendance', canAccess: false },
      { role: 'Employee', resource: 'delete_attendance', canAccess: false },
      { role: 'Employee', resource: 'leaves', canAccess: true },
      { role: 'Employee', resource: 'reports', canAccess: false },
      { role: 'Employee', resource: 'kiosk', canAccess: false },
      { role: 'Employee', resource: 'permissions', canAccess: false },
    ];

    for (const p of defaultPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_resource: {
            role: p.role,
            resource: p.resource
          }
        },
        update: {}, // Keep existing settings intact if they already exist
        create: p
      });
    }

    // Seed default Kiosk Setting if none exists
    const kioskSettingsCount = await prisma.kioskSetting.count();
    if (kioskSettingsCount === 0) {
      console.log('Seeding default Kiosk Geofence Setting...');
      await prisma.kioskSetting.create({
        data: {
          latitude: 11.5564,
          longitude: 104.9282,
          radius: 100.0 // Default 100 meters
        }
      });
    }

    console.log('Role permissions initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize role permissions:', error);
  }
};
