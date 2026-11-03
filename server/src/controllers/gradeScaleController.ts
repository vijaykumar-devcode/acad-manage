import { Request, Response, NextFunction } from 'express';
import { GradeScale } from '../models/GradeScale';

const defaultRules = [
  { grade: 'A+', minPercentage: 90, maxPercentage: 100 },
  { grade: 'A', minPercentage: 80, maxPercentage: 89.99 },
  { grade: 'B', minPercentage: 70, maxPercentage: 79.99 },
  { grade: 'C', minPercentage: 60, maxPercentage: 69.99 },
  { grade: 'D', minPercentage: 50, maxPercentage: 59.99 },
  { grade: 'F', minPercentage: 0, maxPercentage: 49.99 },
];

export const getGradeScale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let scale = await GradeScale.findOne();
    if (!scale) {
      scale = await GradeScale.create({ rules: defaultRules });
    }
    res.status(200).json({ success: true, data: scale });
  } catch (error) {
    next(error);
  }
};

export const updateGradeScale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rules } = req.body;
    let scale = await GradeScale.findOne();
    if (!scale) {
      scale = await GradeScale.create({ rules });
    } else {
      scale.rules = rules;
      await scale.save();
    }
    res.status(200).json({ success: true, data: scale });
  } catch (error) {
    next(error);
  }
};
