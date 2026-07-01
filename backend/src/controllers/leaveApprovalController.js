import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all rules
export const getAllRules = async (req, res) => {
  try {
    const rules = await prisma.leaveApprovalRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const enrichedRules = await Promise.all(rules.map(async (rule) => {
      const approver = await prisma.employee.findUnique({
        where: { staffId: rule.approverId },
        select: { nameEn: true, nameKh: true, staffId: true }
      });

      let targetDept = null;
      if (rule.scope === 'Department' && rule.targetDeptId) {
        targetDept = await prisma.department.findUnique({
          where: { id: rule.targetDeptId },
          select: { nameEn: true, nameKh: true }
        });
      }

      let targetEmployee = null;
      if (rule.scope === 'Employee' && rule.targetStaffId) {
        targetEmployee = await prisma.employee.findUnique({
          where: { staffId: rule.targetStaffId },
          select: { nameEn: true, nameKh: true, staffId: true }
        });
      }

      return {
        ...rule,
        approver,
        targetDept,
        targetEmployee
      };
    }));

    res.json(enrichedRules);
  } catch (error) {
    console.error('Error fetching approval rules:', error);
    res.status(500).json({ message: 'Error fetching approval rules' });
  }
};

// Create a new rule
export const createRule = async (req, res) => {
  const { approverId, scope, targetDeptId, targetStaffId } = req.body;

  if (!approverId || !scope) {
    return res.status(400).json({ message: 'Approver and Scope are required' });
  }

  try {
    const approver = await prisma.employee.findUnique({
      where: { staffId: approverId }
    });

    if (!approver) {
      return res.status(404).json({ message: 'Approver employee not found' });
    }

    if (approver.role === 'Employee') {
      return res.status(400).json({ message: 'Normal employees cannot be leave approvers' });
    }

    let existing = null;
    if (scope === 'Department') {
      if (!targetDeptId) return res.status(400).json({ message: 'Department is required for Department scope' });
      existing = await prisma.leaveApprovalRule.findFirst({
        where: { approverId, scope: 'Department', targetDeptId }
      });
    } else {
      if (!targetStaffId) return res.status(400).json({ message: 'Employee is required for Employee scope' });
      existing = await prisma.leaveApprovalRule.findFirst({
        where: { approverId, scope: 'Employee', targetStaffId }
      });
    }

    if (existing) {
      return res.status(400).json({ message: 'This approval rule already exists' });
    }

    const rule = await prisma.leaveApprovalRule.create({
      data: {
        approverId,
        scope,
        targetDeptId: scope === 'Department' ? targetDeptId : null,
        targetStaffId: scope === 'Employee' ? targetStaffId : null
      }
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating approval rule:', error);
    res.status(500).json({ message: 'Error creating approval rule' });
  }
};

// Delete a rule
export const deleteRule = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.leaveApprovalRule.delete({
      where: { id }
    });
    res.json({ message: 'Approval rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting approval rule:', error);
    res.status(500).json({ message: 'Error deleting approval rule' });
  }
};
