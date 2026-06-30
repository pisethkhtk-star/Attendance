import prisma from '../utils/db.js';

// Get all leave requests (with filters)
export const getAll = async (req, res) => {
  const { status, search, departmentId } = req.query;

  try {
    const where = {};

    if (status) {
      where.status = status; // Pending, Approved, Rejected
    }

    if (departmentId) {
      where.employee = { departmentId };
    }

    if (search) {
      where.OR = [
        { staffId: { contains: search, mode: 'insensitive' } },
        { employee: { nameEn: { contains: search, mode: 'insensitive' } } },
        { employee: { nameKh: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            staffId: true,
            nameEn: true,
            nameKh: true,
            branch: true,
            department: { select: { nameEn: true, nameKh: true } },
            position: { select: { titleEn: true, titleKh: true } }
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    res.json(leaves);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Server error retrieving leaves' });
  }
};

// Get leave history for a specific employee
export const getByEmployee = async (req, res) => {
  const { staffId } = req.params;

  try {
    const leaves = await prisma.leave.findMany({
      where: { staffId },
      include: {
        employee: {
          select: {
            nameEn: true,
            nameKh: true
          }
        }
      },
      orderBy: { leaveDate: 'desc' }
    });

    res.json(leaves);
  } catch (error) {
    console.error('Get employee leaves error:', error);
    res.status(500).json({ message: 'Server error retrieving employee leaves' });
  }
};

// Create leave request
export const create = async (req, res) => {
  const { staffId, leaveDate, leaveType, amountDays, reason } = req.body;

  if (!staffId || !leaveDate || !leaveType || !amountDays) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  try {
    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { staffId }
    });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const leave = await prisma.leave.create({
      data: {
        staffId,
        leaveDate: new Date(leaveDate),
        leaveType,
        amountDays: parseFloat(amountDays),
        reason,
        status: 'Pending'
      }
    });

    res.status(201).json(leave);
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ message: 'Server error creating leave request' });
  }
};

// Approve or Reject leave request
export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, managerName } = req.body; // status must be 'Approved' or 'Rejected'

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status (Approved or Rejected) is required' });
  }

  try {
    const leave = await prisma.leave.findUnique({
      where: { id }
    });

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status,
        managerName: managerName || 'System Admin',
        approvedAt: new Date()
      },
      include: {
        employee: {
          select: { nameEn: true, nameKh: true }
        }
      }
    });

    // If approved, create a skeleton attendance record for the leave day so they aren't marked absent
    if (status === 'Approved') {
      const attendanceDate = leave.leaveDate;
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          staffId_attendanceDate: {
            staffId: leave.staffId,
            attendanceDate
          }
        }
      });

      if (!existingAttendance) {
        // Log leave check-in simulation to prevent absent tags
        await prisma.attendance.create({
          data: {
            staffId: leave.staffId,
            attendanceDate,
            note: `Approved Leave: ${leave.leaveType}`
          }
        });
      }
    }

    res.json(updatedLeave);
  } catch (error) {
    console.error('Approve/Reject leave error:', error);
    res.status(500).json({ message: 'Server error processing leave request' });
  }
};
