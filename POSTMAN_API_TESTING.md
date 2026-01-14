# Postman API Testing Guide - ShreeLove E-commerce Backend

## 🚀 Base URL
```
http://localhost:5000/api/v1
```

## 🔐 Authentication Headers
For protected routes, include this header:
```
Key: token
Value: Bearer YOUR_JWT_TOKEN
```

## 📋 API Endpoints Testing

### 1. Authentication Endpoints

#### Register User
```
POST {{base_url}}/auth/register
```
**Headers:**
```
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```
**Expected Response (201):**
```json
{
  "type": "success",
  "message": "User has been created successfuly",
  "user": {
    "_id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "isAdmin": false,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

#### Login User
```
POST {{base_url}}/auth/login
```
**Headers:**
```
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "username": "john_doe",
  "password": "StrongPassword123!"
}
```
**Expected Response (200):**
```json
{
  "type": "success",
  "message": "Successfully logged in",
  "_id": "user_id",
  "username": "john_doe",
  "email": "john@example.com",
  "isAdmin": false,
  "accessToken": "jwt_token_here"
}
```

### 2. User Management Endpoints

#### Get All Users (Admin Only)
```
GET {{base_url}}/users?page=1&limit=10
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Get User Stats (Admin Only)
```
GET {{base_url}}/users/stats
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Get Single User (Admin Only)
```
GET {{base_url}}/users/USER_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Update User
```
PUT {{base_url}}/users/USER_ID
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "username": "updated_username",
  "email": "updated@example.com"
}
```

#### Delete User (Admin Only)
```
DELETE {{base_url}}/users/USER_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

### 3. Product Management Endpoints

#### Get All Products
```
GET {{base_url}}/products?page=1&limit=10
```
**Optional Query Parameters:**
- `new=true` - Get latest 5 products
- `category=electronics` - Filter by category

#### Get Single Product
```
GET {{base_url}}/products/PRODUCT_ID
```

#### Create Product (Admin Only)
```
POST {{base_url}}/products
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "title": "iPhone 15 Pro",
  "description": "Latest iPhone with advanced features and premium design",
  "image": "https://example.com/iphone15.jpg",
  "categories": ["electronics", "smartphones"],
  "size": "6.1 inch",
  "color": "Space Black",
  "price": 999.99,
  "stock": 50,
  "sku": "IPH15PRO001"
}
```

#### Update Product (Admin Only)
```
PUT {{base_url}}/products/PRODUCT_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "price": 899.99,
  "stock": 45
}
```

#### Delete Product (Admin Only)
```
DELETE {{base_url}}/products/PRODUCT_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

### 4. Cart Management Endpoints

#### Get All Carts (Admin Only)
```
GET {{base_url}}/carts?page=1&limit=10
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Get User Cart
```
GET {{base_url}}/carts/USER_ID
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
```

#### Add to Cart
```
POST {{base_url}}/carts
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "userId": "USER_ID",
  "products": [
    {
      "productId": "PRODUCT_ID",
      "quantity": 2
    }
  ]
}
```

#### Update Cart
```
PUT {{base_url}}/carts/CART_ID
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "products": [
    {
      "productId": "PRODUCT_ID",
      "quantity": 3
    }
  ]
}
```

#### Delete Cart Item
```
DELETE {{base_url}}/carts/CART_ID
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
```

### 5. Order Management Endpoints

#### Get All Orders (Admin Only)
```
GET {{base_url}}/orders?page=1&limit=10
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Get Income Stats (Admin Only)
```
GET {{base_url}}/orders/income
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

#### Get User Orders
```
GET {{base_url}}/orders/USER_ID?page=1&limit=10
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
```

#### Create Order
```
POST {{base_url}}/orders
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "userId": "USER_ID",
  "products": [
    {
      "productId": "PRODUCT_ID",
      "quantity": 1
    }
  ],
  "amount": 999.99,
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  }
}
```

#### Update Order (Admin Only)
```
PUT {{base_url}}/orders/ORDER_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "status": "shipped"
}
```

#### Delete Order (Admin Only)
```
DELETE {{base_url}}/orders/ORDER_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

### 6. Payment Endpoints

#### Create Razorpay Order
```
POST {{base_url}}/payments/create-order
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "amount": 999.99,
  "currency": "INR",
  "receipt": "receipt_001",
  "notes": {
    "order_id": "ORDER_ID"
  }
}
```
**Expected Response (200):**
```json
{
  "type": "success",
  "message": "Razorpay order created successfully",
  "order": {
    "id": "order_razorpay_id",
    "amount": 99999,
    "currency": "INR",
    "receipt": "receipt_001",
    "status": "created"
  }
}
```

#### Verify Payment
```
POST {{base_url}}/payments/verify-payment
```
**Headers:**
```
token: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "pay_razorpay_id",
  "razorpay_signature": "signature_from_razorpay",
  "order_id": "YOUR_ORDER_ID"
}
```

#### Get Payment Details (Admin Only)
```
GET {{base_url}}/payments/payment-details/PAYMENT_ID
```
**Headers:**
```
token: Bearer YOUR_ADMIN_JWT_TOKEN
```

## 🔧 Postman Environment Setup

Create a Postman Environment with these variables:

1. **base_url**: `http://localhost:5000/api/v1`
2. **admin_token**: `Bearer YOUR_ADMIN_JWT_TOKEN`
3. **user_token**: `Bearer YOUR_USER_JWT_TOKEN`
4. **user_id**: `USER_ID_FROM_LOGIN`

## 📝 Testing Workflow

### Step 1: Authentication
1. Register a new user
2. Login with the user credentials
3. Copy the `accessToken` from response
4. Set it in your environment as `user_token`

### Step 2: Create Admin User
1. Register a user
2. Manually set `isAdmin: true` in MongoDB for this user
3. Login with admin credentials
4. Set admin token in environment as `admin_token`

### Step 3: Test Product Management
1. Create products (Admin)
2. Get all products
3. Get single product
4. Update product (Admin)

### Step 4: Test Cart Operations
1. Add products to cart
2. Get user cart
3. Update cart quantities
4. Remove items from cart

### Step 5: Test Order Flow
1. Create an order
2. Create Razorpay payment order
3. Verify payment (use dummy signature for testing)
4. Check order status

## ⚠️ Important Notes

### Error Responses
All endpoints return consistent error format:
```json
{
  "type": "error",
  "message": "Error description",
  "err": "Detailed error (development only)"
}
```

### Pagination
For paginated endpoints, use:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Authentication Errors
- **401**: Invalid or missing token
- **403**: Insufficient permissions
- **404**: Resource not found
- **500**: Server error

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes

## 🧪 Test Data Examples

### Sample User Data
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

### Sample Product Data
```json
{
  "title": "Samsung Galaxy S24",
  "description": "Latest Samsung flagship smartphone with AI features",
  "image": "https://example.com/galaxy-s24.jpg",
  "categories": ["electronics", "smartphones"],
  "price": 799.99,
  "stock": 100,
  "sku": "SAM-S24-001"
}
```

### Sample Order Data
```json
{
  "userId": "USER_ID_HERE",
  "products": [
    {
      "productId": "PRODUCT_ID_HERE",
      "quantity": 1
    }
  ],
  "amount": 799.99,
  "address": {
    "street": "456 Tech Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "zipCode": "560001",
    "country": "India"
  }
}
```

## 🎯 Testing Checklist

- [ ] User registration and login
- [ ] JWT token authentication
- [ ] Admin vs User permissions
- [ ] Product CRUD operations
- [ ] Cart functionality
- [ ] Order creation and management
- [ ] Payment integration
- [ ] Pagination on list endpoints
- [ ] Error handling
- [ ] Rate limiting behavior

Happy Testing! 🚀
