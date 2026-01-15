const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Article = require('../models/Article');

const AnalyticsController = {
    
    /* Get comprehensive dashboard analytics (Admin only) */
    async getDashboardAnalytics(req, res) {
        try {
            // Get date range for filtering (default to last 30 days)
            const { startDate, endDate } = req.query;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const dateFilter = {
                createdAt: {
                    $gte: startDate ? new Date(startDate) : thirtyDaysAgo,
                    $lte: endDate ? new Date(endDate) : new Date()
                }
            };

            // Previous period for growth calculation
            const previousPeriodStart = new Date(thirtyDaysAgo);
            previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
            const previousDateFilter = {
                createdAt: {
                    $gte: previousPeriodStart,
                    $lt: thirtyDaysAgo
                }
            };

            // Basic counts - current period
            const [
                totalProducts,
                totalOrders,
                totalUsers,
                totalArticles,
                totalRevenue,
                previousTotalOrders,
                previousTotalRevenue,
                previousTotalUsers
            ] = await Promise.all([
                Product.countDocuments(),
                Order.countDocuments(dateFilter),
                User.countDocuments({ isAdmin: false, ...dateFilter }),
                Article.countDocuments(),
                Order.aggregate([
                    { $match: { ...dateFilter, status: { $in: ['paid', 'delivered'] } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                Order.countDocuments(previousDateFilter),
                Order.aggregate([
                    { $match: { ...previousDateFilter, status: { $in: ['paid', 'delivered'] } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                User.countDocuments({ isAdmin: false, ...previousDateFilter })
            ]);

            const currentRevenue = totalRevenue[0]?.total || 0;
            const pastRevenue = previousTotalRevenue[0]?.total || 0;

            // Calculate growth percentages
            const revenueGrowth = pastRevenue > 0 ? ((currentRevenue - pastRevenue) / pastRevenue * 100) : 0;
            const orderGrowth = previousTotalOrders > 0 ? ((totalOrders - previousTotalOrders) / previousTotalOrders * 100) : 0;
            const customerGrowth = previousTotalUsers > 0 ? ((totalUsers - previousTotalUsers) / previousTotalUsers * 100) : 0;

            // Current and last month revenue
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            
            const lastMonth = new Date(currentMonth);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
                Order.aggregate([
                    { $match: { createdAt: { $gte: currentMonth }, status: { $in: ['paid', 'delivered'] } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                Order.aggregate([
                    { $match: { 
                        createdAt: { $gte: lastMonth, $lt: currentMonth }, 
                        status: { $in: ['paid', 'delivered'] } 
                    }},
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
            ]);

            // Orders by status
            const ordersByStatus = await Order.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            // Monthly revenue for chart (last 12 months)
            const monthlyRevenue = await Order.aggregate([
                {
                    $match: {
                        status: { $in: ['paid', 'delivered'] },
                        createdAt: { $gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1) }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        revenue: { $sum: '$amount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            // Fill missing months with 0
            const monthlyRevenueArray = new Array(12).fill(0);
            monthlyRevenue.forEach(item => {
                const monthIndex = item._id.month - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    monthlyRevenueArray[monthIndex] = item.revenue;
                }
            });

            // Top selling products
            const topSellingProducts = await Order.aggregate([
                { $match: { status: { $in: ['paid', 'delivered'] } } },
                { $unwind: '$products' },
                {
                    $group: {
                        _id: '$products.productId',
                        totalSold: { $sum: '$products.quantity' }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: '$productDetails' },
                {
                    $project: {
                        title: '$productDetails.title',
                        totalSold: 1,
                        totalRevenue: { $multiply: ['$totalSold', '$productDetails.price'] }
                    }
                }
            ]);

            // Product stock analysis
            const outOfStockProducts = await Product.countDocuments({ stock: 0 });
            const lowStockProducts = await Product.countDocuments({ stock: { $gt: 0, $lte: 5 } });

            // New customers this month
            const newCustomersThisMonth = await User.countDocuments({
                isAdmin: false,
                createdAt: { $gte: currentMonth }
            });

            // Returning customers (users who have more than one order)
            const returningCustomers = await Order.aggregate([
                { $group: { _id: '$customer.email', orderCount: { $sum: 1 } } },
                { $match: { orderCount: { $gt: 1 } } },
                { $count: "returningCustomers" }
            ]);

            res.status(200).json({
                type: "success",
                data: {
                    // Structure expected by frontend
                    totalRevenue: currentRevenue,
                    revenueGrowthPercentage: Math.round(revenueGrowth * 100) / 100,
                    currentMonthRevenue: currentMonthRevenue[0]?.total || 0,
                    lastMonthRevenue: lastMonthRevenue[0]?.total || 0,
                    
                    totalOrders,
                    orderGrowthPercentage: Math.round(orderGrowth * 100) / 100,
                    ordersByStatus: ordersByStatus.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    
                    totalCustomers: totalUsers,
                    customerGrowthPercentage: Math.round(customerGrowth * 100) / 100,
                    newCustomersThisMonth,
                    returningCustomers: returningCustomers[0]?.returningCustomers || 0,
                    
                    totalProducts,
                    outOfStockProducts,
                    lowStockProducts,
                    
                    topSellingProducts,
                    monthlyRevenue: monthlyRevenueArray
                }
            });

        } catch (error) {
            console.error('Get dashboard analytics error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve dashboard analytics",
                error: error.message
            });
        }
    },

    /* Get sales analytics (Admin only) */
    async getSalesAnalytics(req, res) {
        try {
            const { period = 'month', startDate, endDate } = req.query;
            
            // Define date ranges based on period
            let dateRange = {};
            const now = new Date();
            
            switch (period) {
                case 'week':
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    dateRange = { createdAt: { $gte: weekAgo } };
                    break;
                case 'month':
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    dateRange = { createdAt: { $gte: monthAgo } };
                    break;
                case 'year':
                    const yearAgo = new Date();
                    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                    dateRange = { createdAt: { $gte: yearAgo } };
                    break;
                case 'custom':
                    if (startDate && endDate) {
                        dateRange = {
                            createdAt: {
                                $gte: new Date(startDate),
                                $lte: new Date(endDate)
                            }
                        };
                    }
                    break;
            }

            // Sales metrics
            const salesMetrics = await Order.aggregate([
                { $match: { ...dateRange, status: { $in: ['paid', 'delivered'] } } },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$amount' },
                        totalOrders: { $sum: 1 },
                        averageOrderValue: { $avg: '$amount' }
                    }
                }
            ]);

            // Sales by time period
            let groupByFormat = "%Y-%m-%d";
            if (period === 'year') groupByFormat = "%Y-%m";
            if (period === 'week') groupByFormat = "%Y-%m-%d";

            const salesByPeriod = await Order.aggregate([
                { $match: { ...dateRange, status: { $in: ['paid', 'delivered'] } } },
                {
                    $group: {
                        _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
                        sales: { $sum: '$amount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { '_id': 1 } }
            ]);

            // Sales by product category
            const salesByCategory = await Order.aggregate([
                { $match: { ...dateRange, status: { $in: ['paid', 'delivered'] } } },
                { $unwind: '$products' },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'products.productId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: '$productDetails' },
                { $unwind: { path: '$productDetails.categories', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$productDetails.categories',
                        sales: { $sum: { $multiply: ['$products.quantity', '$productDetails.price'] } },
                        quantity: { $sum: '$products.quantity' }
                    }
                },
                { $sort: { sales: -1 } }
            ]);

            res.status(200).json({
                type: "success",
                data: {
                    metrics: salesMetrics[0] || { totalSales: 0, totalOrders: 0, averageOrderValue: 0 },
                    salesByPeriod,
                    salesByCategory
                }
            });

        } catch (error) {
            console.error('Get sales analytics error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve sales analytics",
                error: error.message
            });
        }
    },

    /* Get customer analytics (Admin only) */
    async getCustomerAnalytics(req, res) {
        try {
            // Customer demographics from orders
            const customerStats = await Order.aggregate([
                {
                    $group: {
                        _id: '$customer.email',
                        customerName: { $first: '$customer.name' },
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: { $cond: [{ $in: ['$status', ['paid', 'delivered']] }, '$amount', 0] } },
                        lastOrderDate: { $max: '$createdAt' },
                        city: { $first: '$address.city' },
                        state: { $first: '$address.state' }
                    }
                }
            ]);

            // Top customers
            const topCustomers = customerStats
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 10);

            // Customer retention (repeat customers)
            const repeatCustomers = customerStats.filter(customer => customer.totalOrders > 1);
            const retentionRate = (repeatCustomers.length / customerStats.length) * 100;

            // Geographic distribution
            const customersByLocation = await Order.aggregate([
                { $match: { status: { $in: ['paid', 'delivered'] } } },
                {
                    $group: {
                        _id: {
                            state: '$address.state',
                            city: '$address.city'
                        },
                        customers: { $addToSet: '$customer.email' },
                        orders: { $sum: 1 },
                        revenue: { $sum: '$amount' }
                    }
                },
                {
                    $project: {
                        state: '$_id.state',
                        city: '$_id.city',
                        uniqueCustomers: { $size: '$customers' },
                        orders: 1,
                        revenue: 1
                    }
                },
                { $sort: { revenue: -1 } },
                { $limit: 20 }
            ]);

            res.status(200).json({
                type: "success",
                data: {
                    totalCustomers: customerStats.length,
                    repeatCustomers: repeatCustomers.length,
                    retentionRate: Math.round(retentionRate * 100) / 100,
                    topCustomers,
                    customersByLocation,
                    averageOrderValue: customerStats.reduce((sum, customer) => sum + (customer.totalSpent / customer.totalOrders), 0) / customerStats.length || 0
                }
            });

        } catch (error) {
            console.error('Get customer analytics error:', error);
            res.status(500).json({
                type: "error",
                message: "Failed to retrieve customer analytics",
                error: error.message
            });
        }
    }
};

module.exports = AnalyticsController;