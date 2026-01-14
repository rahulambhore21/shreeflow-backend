# ShreeLove Backend - E-commerce API

## Overview
This is a secure Node.js e-commerce backend application with authentication, payment processing via Razorpay, and comprehensive API endpoints for managing users, products, carts, and orders.

## 🔒 Security Features Implemented

### Authentication & Authorization
- JWT-based authentication with secure token verification
- Role-based access control (Admin/User)
- Strong password hashing with bcrypt
- Rate limiting on authentication endpoints (5 attempts/15 minutes)
- General API rate limiting (100 requests/15 minutes)

### Data Protection
- Input validation using express-validator
- MongoDB injection protection through proper schema validation
- CORS configuration with specific origins
- Helmet security headers
- Environment variable validation

### Database Security
- ObjectId references instead of string IDs for better data integrity
- Proper indexes for performance optimization
- Data validation constraints on all models
- Secure password storage (never exposed in API responses)

## 🏗️ Architecture

### Models
- **User**: Authentication and user management with email validation
- **Product**: Product catalog with categories, pricing, and inventory
- **Cart**: Shopping cart functionality with user/product relationships
- **Order**: Order management with Razorpay payment integration

### API Endpoints

#### Authentication (`/api/v1/auth`)
- `POST /register` - User registration with validation
- `POST /login` - User login with JWT token generation

#### Users (`/api/v1/users`)
- `GET /` - Get all users (Admin only)
- `GET /stats` - Get user statistics (Admin only)
- `GET /:id` - Get user by ID (Admin only)
- `PUT /:id` - Update user (User/Admin)
- `DELETE /:id` - Delete user (Admin only)

#### Products (`/api/v1/products`)
- `GET /` - Get all products with pagination and filtering
- `GET /:id` - Get product by ID
- `POST /` - Create product (Admin only)
- `PUT /:id` - Update product (Admin only)
- `DELETE /:id` - Delete product (Admin only)

#### Cart (`/api/v1/carts`)
- `GET /` - Get all carts (Admin only)
- `GET /:userId` - Get user cart
- `POST /` - Add to cart
- `PUT /:id` - Update cart
- `DELETE /:id` - Delete from cart

#### Orders (`/api/v1/orders`)
- `GET /` - Get all orders (Admin only)
- `GET /income` - Get income statistics (Admin only)
- `GET /:userId` - Get user orders
- `POST /` - Create order
- `PUT /:id` - Update order (Admin only)
- `DELETE /:id` - Delete order (Admin only)

#### Payments (`/api/v1/payments`)
- `POST /create-order` - Create Razorpay order
- `POST /verify-payment` - Verify Razorpay payment
- `GET /payment-details/:payment_id` - Get payment details (Admin only)

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Razorpay account (for payments)

### Installation

1. **Clone and navigate to project**
   ```bash
   cd shreelove-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file with the following:
   ```env
   JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   MONGODB_URI=mongodb://localhost:27017/shreelove_db
   CLIENT_URL=http://localhost:3000
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## ⚠️ Security Configuration Required

### Critical: Update Environment Variables
The current `.env` file contains example values. **MUST** update:

1. **JWT_SECRET**: Generate a strong 32+ character secret
   ```bash
   # Generate using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Razorpay Credentials**: Replace with your actual Razorpay key ID and secret from your Razorpay dashboard

3. **MongoDB URI**: Update with your actual database connection string

### Production Checklist
- [ ] Strong JWT secret (32+ characters)
- [ ] Real Razorpay credentials
- [ ] Secure MongoDB connection
- [ ] CORS origins restricted to your domain
- [ ] NODE_ENV set to 'production'
- [ ] Error messages don't expose sensitive information

## 🔧 API Usage Examples

### Authentication
```javascript
// Register
POST /api/v1/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}

// Login
POST /api/v1/auth/login
{
  "username": "john_doe",
  "password": "StrongPassword123!"
}
```

### Headers for Protected Routes
```javascript
{
  "token": "Bearer YOUR_JWT_TOKEN"
}
```

### Payment Flow
```javascript
// 1. Create Razorpay order
POST /api/v1/payments/create-order
{
  "amount": 1500,
  "currency": "INR",
  "receipt": "receipt_001"
}

// 2. Verify payment after user pays
POST /api/v1/payments/verify-payment
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx",
  "order_id": "your_order_id"
}
```

## 🛠️ Development

### Database Indexes
Automatically created indexes for optimal performance:
- User: email, username, createdAt
- Product: title, categories, price, createdAt, sku
- Cart: userId, products.productId
- Order: userId, status, createdAt, payment IDs

### Error Handling
Comprehensive error handling with:
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

### Validation
All inputs are validated using express-validator:
- User registration: username (3-30 chars), valid email, strong password
- Product creation: title, description, positive price
- Order creation: required fields and data types

## 📚 Recent Improvements

### Security Enhancements
✅ Strong JWT secret generation and validation
✅ Removed exposed Razorpay credentials
✅ Fixed authentication status codes (401 instead of 500)
✅ Enhanced error messages with consistent structure
✅ Added proper try-catch blocks for async operations

### Database Improvements
✅ Converted String IDs to ObjectId references with population
✅ Added comprehensive validation to all models
✅ Created performance indexes on frequently queried fields
✅ Added inventory tracking (stock field) to products

### Code Quality
✅ Consistent error response format across all endpoints
✅ Proper async/await error handling
✅ Enhanced logging for debugging
✅ Improved middleware error messages

## 🤝 Contributing
1. Follow the existing code structure
2. Add proper validation for new endpoints
3. Include error handling for all async operations
4. Update this README for any new features
5. Test thoroughly before submitting

## 📄 License
ISC License - See package.json for details.