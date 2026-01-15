# Shiprocket Integration Guide

## 🚨 Critical Issues Found & Fixes

### **Issue 1: Incorrect Authentication Method (CRITICAL)**

**Problem:** The current authentication uses `token` as password, which is incorrect.

```javascript
// ❌ WRONG - Current implementation
const response = await axios.post(`${this.baseURL}/auth/login`, {
    email: integration.email,
    password: integration.token // This is incorrect!
});
```

**Solution:** Use actual Shiprocket account password:

```javascript
// ✅ CORRECT - Fixed implementation  
const response = await axios.post(`${this.baseURL}/auth/login`, {
    email: integration.email,
    password: integration.password // Use actual password
});
```

## 🔧 Required Code Changes

### 1. Update Shiprocket Service Authentication

**File:** `services/shiprocketService.js`

```javascript
// Line ~29 - Fix authentication method
async authenticate() {
    try {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        const integration = await this.getIntegration();

        const response = await axios.post(`${this.baseURL}/auth/login`, {
            email: integration.email,
            password: integration.password // ✅ FIXED: Use password not token
        });

        if (response.data && response.data.token) {
            this.token = response.data.token;
            // Token expires in 10 days, set expiry to 9 days to be safe
            this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
            return this.token;
        }

        throw new Error('Failed to get authentication token');
    } catch (error) {
        console.error('Shiprocket authentication error:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Shiprocket');
    }
}
```

### 2. Update Database Model

**File:** `models/Shipping.js`

```javascript
// Update ShiprocketIntegration schema
const ShiprocketIntegrationSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true 
    },
    password: { // ✅ CHANGED: from 'token' to 'password'
        type: String, 
        required: true,
        minlength: 6
    },
    isActive: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true
});
```

### 3. Update Shipping Controller

**File:** `controllers/ShippingController.js`

```javascript
async saveShiprocketIntegration(req, res) {
    try {
        const { email, password } = req.body; // ✅ CHANGED: 'token' to 'password'

        if (!email || !password) {
            return res.status(400).json({
                type: "error",
                message: "Email and password are required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                type: "error",
                message: "Please provide a valid email address"
            });
        }

        // Find existing integration or create new one
        let integration = await ShiprocketIntegration.findOne();
        
        if (integration) {
            // Update existing integration
            integration.email = email;
            integration.password = password; // ✅ CHANGED: Store password
            integration.isActive = true;
            integration.updatedAt = new Date();
            await integration.save();
        } else {
            // Create new integration
            integration = new ShiprocketIntegration({
                email,
                password, // ✅ CHANGED: Store password
                isActive: true
            });
            await integration.save();
        }

        res.status(200).json({
            type: "success",
            message: "Shiprocket integration settings saved successfully",
            data: {
                email: integration.email,
                isActive: integration.isActive,
                updatedAt: integration.updatedAt
            }
        });

    } catch (error) {
        console.error('Save Shiprocket integration error:', error);
        res.status(500).json({
            type: "error",
            message: "Failed to save Shiprocket integration settings",
            error: error.message
        });
    }
}
```

### 4. Update Frontend Component

**File:** `components/admin/ShippingPage.tsx`

```typescript
// Update state variables
const [shiprocketPassword, setShiprocketPassword] = useState('');

// Update the form
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Shiprocket Password
  </label>
  <Input
    type="password"
    placeholder="Enter your Shiprocket account password"
    className="max-w-md"
    value={shiprocketPassword}
    onChange={(e) => setShiprocketPassword(e.target.value)}
  />
  <p className="text-xs text-gray-500 mt-1">
    Use your Shiprocket account password, not API token
  </p>
</div>

// Update save handler
const handleSaveShiprocketIntegration = async () => {
  if (!shiprocketEmail.trim() || !shiprocketPassword.trim()) {
    toast({
      title: "Validation Error",
      description: "Please fill in both email and password",
      variant: "destructive",
    });
    return;
  }

  try {
    setIsSavingIntegration(true);
    
    // Save Shiprocket integration settings
    await shippingService.saveShiprocketIntegration({
      email: shiprocketEmail,
      password: shiprocketPassword // ✅ CHANGED: Send password
    });
    
    toast({
      title: "Success",
      description: "Shiprocket integration settings saved successfully",
    });
  } catch (error: any) {
    console.error('Error saving Shiprocket integration:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to save Shiprocket integration settings",
      variant: "destructive",
    });
  } finally {
    setIsSavingIntegration(false);
  }
};
```

## 🧪 Testing & Debugging

### Test Authentication Manually

```bash
# Test Shiprocket authentication directly
curl -X POST https://apiv2.shiprocket.in/v1/external/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-actual-email@domain.com",
    "password": "your-actual-password"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user_email": "your-email@domain.com",
  "first_name": "Your Name",
  "last_name": "Last Name"
}
```

### Common Error Responses

| Error | Cause | Solution |
|-------|--------|----------|
| `401 Unauthorized` | Wrong email/password | Verify Shiprocket login credentials |
| `422 Unprocessable Entity` | Missing required fields | Check request body format |
| `429 Too Many Requests` | Rate limit exceeded | Add delays between requests |

## 📋 Shiprocket Account Requirements Checklist

### Before Integration:
- [ ] **Active Shiprocket Account** - Account must be active and verified
- [ ] **KYC Completed** - Complete Know Your Customer verification
- [ ] **Pickup Address Configured** - At least one pickup location set up
- [ ] **Wallet Recharged** - Required for COD orders
- [ ] **API Access Enabled** - Ensure API access is enabled in your account

### Account Setup Steps:
1. **Login to Shiprocket Panel** → https://app.shiprocket.in/
2. **Complete KYC** → Settings → KYC Documents
3. **Add Pickup Address** → Settings → Pickup Addresses
4. **Recharge Wallet** → Wallet → Add Money (for COD orders)
5. **Verify Rate Card** → Ensure rates are configured

## 🚀 Order Creation Requirements

### Required Order Data Format:
```javascript
const orderData = {
  order_id: "unique_order_id",
  order_date: "2024-01-15", // YYYY-MM-DD format
  pickup_location: "Primary", // Must match your pickup location name
  billing_customer_name: "John",
  billing_last_name: "Doe",
  billing_address: "Complete address with building/house number",
  billing_city: "Mumbai",
  billing_pincode: "400001", // Must be valid Indian pincode
  billing_state: "Maharashtra",
  billing_country: "India",
  billing_email: "customer@email.com",
  billing_phone: "9876543210", // 10-digit Indian mobile number
  shipping_is_billing: true,
  order_items: [{
    name: "Product Name",
    sku: "SKU123",
    units: 1,
    selling_price: 299,
    discount: 0,
    tax: 0,
    hsn: 123456 // HSN code for tax purposes
  }],
  payment_method: "COD", // or "Prepaid"
  sub_total: 299,
  length: 10, // cm
  breadth: 10, // cm  
  height: 5, // cm
  weight: 0.5 // kg
};
```

### Important Validation Rules:
- **Pincode:** Must be valid Indian pincode (6 digits)
- **Phone:** Must be 10-digit Indian mobile number
- **Weight:** Minimum 0.1kg, maximum varies by courier
- **Dimensions:** All dimensions in centimeters
- **Order ID:** Must be unique across all your orders

## 🔍 Troubleshooting Guide

### Issue: Authentication Fails
**Check:**
1. Email and password are correct
2. Account is active (not suspended)
3. No special characters causing encoding issues

### Issue: Order Creation Fails
**Check:**
1. All required fields are present
2. Pickup location name matches exactly
3. Pincode is serviceable by couriers
4. Weight and dimensions are realistic

### Issue: No Rates Available  
**Check:**
1. Pickup and delivery pincodes are valid
2. Weight is within courier limits
3. COD amount doesn't exceed limits

## 📊 Monitoring & Logs

### Add Proper Logging:
```javascript
// In shiprocketService.js
console.log('🔐 Authenticating with Shiprocket...', { email: integration.email });
console.log('📦 Creating order...', { order_id: orderData.order_id, weight: orderData.weight });
console.log('✅ Order created successfully', { shipment_id: response.shipment_id });
```

### Health Check Endpoint:
Add monitoring for Shiprocket connectivity:
```javascript
// GET /api/v1/shipping/shiprocket/health
async checkShiprocketHealth(req, res) {
    try {
        const token = await shiprocketService.authenticate();
        const pickup = await shiprocketService.getPickupLocations();
        
        res.json({
            status: 'healthy',
            authenticated: !!token,
            pickup_locations: pickup.data?.length || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
```

## 🔒 Security Best Practices

1. **Never log passwords** in production
2. **Encrypt stored credentials** in database
3. **Use environment variables** for sensitive config
4. **Implement rate limiting** for API calls
5. **Validate all input data** before sending to Shiprocket

## 📞 Support

- **Shiprocket Support:** support@shiprocket.in
- **API Documentation:** https://apidocs.shiprocket.in/
- **Developer Portal:** https://app.shiprocket.in/seller/api

---

## ⚡ Quick Start After Fixes

1. **Update all code** as shown above
2. **Clear existing integration** from database
3. **Re-enter credentials** using actual password
4. **Test authentication** endpoint first
5. **Create test order** with valid data
6. **Monitor logs** for any issues

**Note:** After making these changes, you'll need to re-configure your Shiprocket integration in the admin panel using your actual Shiprocket account password instead of an API token.