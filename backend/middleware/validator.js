import { validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Checks validation results from express-validator
 * 
 * Time Complexity: O(n) where n is number of validation errors
 * Space Complexity: O(n)
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};
