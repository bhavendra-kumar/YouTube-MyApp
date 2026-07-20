// @ts-nocheck
export function sendSuccess(res: any, data: any, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}
