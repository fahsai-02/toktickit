import { Router, type Request, type Response } from 'express';
import { db } from '../db.js';
import { sendError } from '../lib/httpErrors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ownershipWhereFor } from '../lib/requestHelpers.js';
import {
  BY_IT_PRIORITY_BUCKETS,
  urgentTicketWhere,
} from '../lib/dashboardQueries.js';

const router: Router = Router();

// GET /api/dashboards/requester (FR-13, BR-17..BR-21, AC-10)
router.get('/requester', requireAuth, async (req: Request, res: Response) => {
  try {
    const scope = ownershipWhereFor(req.user!);

    const [statusRows, recentTickets, recentlyResolved] = await Promise.all([
      db.ticket.groupBy({
        by: ['currentStatus'],
        where: scope,
        _count: { _all: true },
      }),
      db.ticket.findMany({
        where: scope,
        orderBy: [{ updatedAt: 'desc' }, { ticketNumber: 'desc' }],
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          itPriority: true,
          updatedAt: true,
        },
      }),
      db.ticket.findMany({
        where: { AND: [scope, { currentStatus: 'RESOLVED' }] },
        orderBy: [{ updatedAt: 'desc' }, { ticketNumber: 'desc' }],
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          updatedAt: true,
        },
      }),
    ]);

    const statusCounts = new Map<string, number>();
    for (const row of statusRows) {
      statusCounts.set(row.currentStatus, row._count._all);
    }

    const cNew = statusCounts.get('NEW') ?? 0;
    const cOpen = statusCounts.get('OPEN') ?? 0;
    const cInProgress = statusCounts.get('IN_PROGRESS') ?? 0;
    const cWaiting = statusCounts.get('WAITING_FOR_REQUESTER') ?? 0;
    const cResolved = statusCounts.get('RESOLVED') ?? 0;
    const cClosed = statusCounts.get('CLOSED') ?? 0;
    const cReopened = statusCounts.get('REOPENED') ?? 0;

    const counts = {
      open: cNew + cOpen + cInProgress + cWaiting + cReopened,
      inProgress: cInProgress,
      waitingForRequester: cWaiting,
      resolved: cResolved,
      closed: cClosed,
      attentionRequired: cWaiting + cReopened,
    };

    res.json({
      data: {
        counts,
        recentTickets,
        recentlyResolved,
      },
    });
  } catch (err) {
    console.error('Requester dashboard error:', err);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
});

// GET /api/dashboards/staff (FR-14, FR-15, FR-17, FR-18, BR-17..BR-21, AC-11, AC-12)
router.get(
  '/staff',
  requireAuth,
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const [
        statusRows,
        unassignedCount,
        myAssignedCount,
        urgentCount,
        priorityRows,
        recentTickets,
        urgentTickets,
        recentActions,
        userCountsData,
      ] = await Promise.all([
        db.ticket.groupBy({
          by: ['currentStatus'],
          _count: { _all: true },
        }),
        db.ticket.count({ where: { ownerId: null } }),
        db.ticket.count({ where: { ownerId: user.id } }),
        db.ticket.count({ where: urgentTicketWhere() }),
        db.ticket.groupBy({
          by: ['itPriority'],
          _count: { _all: true },
        }),
        db.ticket.findMany({
          orderBy: [{ updatedAt: 'desc' }, { ticketNumber: 'desc' }],
          take: 5,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            currentStatus: true,
            itPriority: true,
            owner: { select: { id: true, name: true } },
            updatedAt: true,
          },
        }),
        db.ticket.findMany({
          where: urgentTicketWhere(),
          orderBy: [{ updatedAt: 'desc' }, { ticketNumber: 'desc' }],
          take: 10,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            currentStatus: true,
            itPriority: true,
            owner: { select: { id: true, name: true } },
            updatedAt: true,
          },
        }),
        db.actionTaken.findMany({
          where: { performedById: user.id },
          orderBy: [{ actionDate: 'desc' }, { id: 'desc' }],
          take: 5,
          select: {
            id: true,
            ticketId: true,
            actionDate: true,
            description: true,
            result: true,
            performedById: true,
            updatedAt: true,
            ticket: { select: { ticketNumber: true } },
          },
        }),
        user.role === 'ADMINISTRATOR'
          ? Promise.all([
              db.user.count(),
              db.user.count({ where: { isActive: true } }),
            ])
          : Promise.resolve(null),
      ]);

      const statusMap = new Map<string, number>();
      for (const row of statusRows) {
        statusMap.set(row.currentStatus, row._count._all);
      }

      const counts = {
        new: statusMap.get('NEW') ?? 0,
        open: statusMap.get('OPEN') ?? 0,
        inProgress: statusMap.get('IN_PROGRESS') ?? 0,
        waitingForRequester: statusMap.get('WAITING_FOR_REQUESTER') ?? 0,
        unassigned: unassignedCount,
        myAssigned: myAssignedCount,
        urgentTickets: urgentCount,
      };

      const priorityMap = new Map<string | null, number>();
      for (const row of priorityRows) {
        priorityMap.set(row.itPriority, row._count._all);
      }

      const byItPriority = BY_IT_PRIORITY_BUCKETS.map((bucket) => ({
        itPriority: bucket,
        count: priorityMap.get(bucket) ?? 0,
      }));

      const myRecentActions = recentActions.map((action) => ({
        id: action.id,
        ticketId: action.ticketId,
        ticketNumber: action.ticket.ticketNumber,
        actionDate: action.actionDate,
        description: action.description,
        result: action.result,
        performedById: action.performedById,
        updatedAt: action.updatedAt,
      }));

      const payload: Record<string, unknown> = {
        counts,
        byItPriority,
        recentTickets,
        urgentTickets,
        myRecentActions,
      };

      if (user.role === 'ADMINISTRATOR' && userCountsData !== null) {
        const [total, active] = userCountsData;
        payload.userCounts = {
          total,
          active,
          inactive: total - active,
        };
      }

      res.json({ data: payload });
    } catch (err) {
      console.error('Staff dashboard error:', err);
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
    }
  }
);

export default router;
