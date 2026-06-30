import prisma from './db.js';

// Get local Cambodia (UTC+7) Date string and Time string
export const getLocalTimeDetails = (customTime, customDate) => {
  const now = new Date();
  const cambodiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" }));

  let dateString;
  if (customDate) {
    dateString = customDate; // Format: "YYYY-MM-DD"
  } else {
    const year = cambodiaTime.getFullYear();
    const month = String(cambodiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(cambodiaTime.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  }

  let timeString;
  if (customTime) {
    timeString = customTime; // Format: "HH:mm"
  } else {
    const hours = String(cambodiaTime.getHours()).padStart(2, '0');
    const minutes = String(cambodiaTime.getMinutes()).padStart(2, '0');
    timeString = `${hours}:${minutes}`;
  }

  return {
    dateObj: new Date(dateString),
    dateString,
    timeString
  };
};

// Convert "HH:mm" string to minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Determine the action automatically based on current time and existing attendance
export const determineAutoAction = (employee, existingAttendance, timeString) => {
  const currentMinutes = timeToMinutes(timeString);
  const s1EndMinutes = timeToMinutes(employee.shift1End);
  const s2StartMinutes = timeToMinutes(employee.shift2Start);
  
  // Calculate midpoint between shift 1 end and shift 2 start (defaults to 12:30 if shifts are 12:00 and 13:00)
  const midpointMinutes = s1EndMinutes + (s2StartMinutes - s1EndMinutes) / 2;

  if (!existingAttendance) {
    // First scan of the day
    if (currentMinutes < midpointMinutes) {
      return 'checkin_1';
    } else {
      return 'checkin_2';
    }
  }

  const { checkin1, checkout1, checkin2, checkout2 } = existingAttendance;

  if (currentMinutes < midpointMinutes) {
    // We are in the morning window
    if (!checkin1) {
      return 'checkin_1';
    }
    if (!checkout1) {
      return 'checkout_1';
    }
    // Fall forward to afternoon shift if morning is already complete
    if (!checkin2) {
      return 'checkin_2';
    }
    return 'checkout_2';
  } else {
    // We are in the afternoon window
    if (!checkin2) {
      // If they skipped checkin1/checkout1 completely, let's see if we should map to checkin1
      if (!checkin1) {
        return 'checkin_1';
      }
      return 'checkin_2';
    }
    if (!checkout2) {
      return 'checkout_2';
    }
    // Fall back or absolute end fallback
    if (!checkout1) {
      return 'checkout_1';
    }
    return 'checkout_2';
  }
};

// Perform core attendance processing
export const processAttendanceScan = async ({ staffId, action: requestedAction, customTime, customDate, note }) => {
  // 1. Fetch employee
  const employee = await prisma.employee.findUnique({
    where: { staffId }
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const { dateObj, timeString } = getLocalTimeDetails(customTime, customDate);

  // 2. Fetch existing attendance
  let attendance = await prisma.attendance.findUnique({
    where: {
      staffId_attendanceDate: {
        staffId,
        attendanceDate: dateObj
      }
    }
  });

  // 3. Determine action
  const action = requestedAction || determineAutoAction(employee, attendance, timeString);

  // 4. Update fields
  const updateData = {};
  if (note) updateData.note = note;

  if (action === 'checkin_1') {
    updateData.checkin1 = timeString;
  } else if (action === 'checkout_1') {
    updateData.checkout1 = timeString;
  } else if (action === 'checkin_2') {
    updateData.checkin2 = timeString;
  } else if (action === 'checkout_2') {
    updateData.checkout2 = timeString;
  }

  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: {
        staffId,
        attendanceDate: dateObj,
        ...updateData
      }
    });
  } else {
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData
    });
  }

  // 5. Recalculate late and early metrics
  const c1 = attendance.checkin1 || updateData.checkin1;
  const c2 = attendance.checkin2 || updateData.checkin2;
  const o1 = attendance.checkout1 || updateData.checkout1;
  const o2 = attendance.checkout2 || updateData.checkout2;

  const s1Start = employee.shift1Start;
  const s1End = employee.shift1End;
  const s2Start = employee.shift2Start;
  const s2End = employee.shift2End;

  let isLate = false;
  let isEarlyLeave = false;

  if (c1 && c1 > s1Start) isLate = true;
  if (c2 && c2 > s2Start) isLate = true;
  if (o1 && o1 < s1End) isEarlyLeave = true;
  if (o2 && o2 < s2End) isEarlyLeave = true;

  const finalAttendance = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      isLate,
      isEarlyLeave
    },
    include: {
      employee: {
        select: {
          nameEn: true,
          nameKh: true,
          branch: true,
          department: { select: { nameEn: true, nameKh: true } }
        }
      }
    }
  });

  return {
    attendance: finalAttendance,
    action,
    timeString,
    dateString: dateObj.toISOString().split('T')[0]
  };
};
