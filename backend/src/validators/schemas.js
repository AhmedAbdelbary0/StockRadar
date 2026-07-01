const Joi = require('joi');

/**
 * Schema for POST /api/inventory/batch
 */
const batchIntakeSchema = Joi.object({
  sku: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': 'SKU is required',
      'string.max': 'SKU must not exceed 50 characters',
    }),
  name: Joi.string().trim().min(1).max(255).required()
    .messages({
      'string.empty': 'Product name is required',
      'string.max': 'Product name must not exceed 255 characters',
    }),
  category: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Category is required',
    }),
  batch_number: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Batch number is required',
    }),
  quantity_received: Joi.number().integer().min(1).required()
    .messages({
      'number.min': 'Quantity must be at least 1',
      'number.base': 'Quantity must be a valid number',
    }),
  cost_price: Joi.number().precision(2).min(0).required()
    .messages({
      'number.min': 'Cost price cannot be negative',
      'number.base': 'Cost price must be a valid number',
    }),
  expiry_date: Joi.date().iso().greater('now').required()
    .messages({
      'date.greater': 'Expiry date must be in the future',
      'date.format': 'Expiry date must be a valid ISO date (YYYY-MM-DD)',
    }),
});

/**
 * Schema for POST /api/sales
 */
const salesLogSchema = Joi.object({
  sku: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': 'Product SKU is required',
    }),
  quantity_sold: Joi.number().integer().min(1).required()
    .messages({
      'number.min': 'Quantity sold must be at least 1',
      'number.base': 'Quantity sold must be a valid number',
    }),
  sale_price: Joi.number().precision(2).min(0).required()
    .messages({
      'number.min': 'Sale price cannot be negative',
      'number.base': 'Sale price must be a valid number',
    }),
});

module.exports = { batchIntakeSchema, salesLogSchema };
