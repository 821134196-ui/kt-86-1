import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any = null,
  message: string = 'Success',
  statusCode: number = 200,
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const paginatedResponse = (
  res: Response,
  data: any[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success',
) => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};
