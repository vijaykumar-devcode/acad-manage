import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SupportTicket } from '../models/SupportTicket';

// ─── Validation ───────────────────────────────────────────────────────────────

const createTicketSchema = z.object({
  category: z.string().min(2, 'Category is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'resolved']),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const { category, description } = createTicketSchema.parse(req.body);

    const ticket = await SupportTicket.create({
      userId: user._id,
      category,
      description,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

/** Admin-only: returns all tickets */
export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'name email role avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

/** Any authenticated user: returns only their own tickets */
export const getMyTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const tickets = await SupportTicket.find({ userId: user._id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const ticket = await SupportTicket.findByIdAndUpdate(id, { status }, { new: true });

    if (!ticket) {
      res.status(404);
      throw new Error('Ticket not found');
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const deleteTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findByIdAndDelete(id);

    if (!ticket) {
      res.status(404);
      throw new Error('Ticket not found');
    }

    res.status(200).json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    next(error);
  }
};
