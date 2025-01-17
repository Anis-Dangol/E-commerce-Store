import User from "../models/user.model.js";

export const getAnalyticsData = async (req, res) => {
    const totalUsers = await User.countDocuments({});
    const totalProducts = await Product.countDocuments({});

    const salesData = await Order.aggregate([
        {
            $group: {
                _id: null,  // it groups all documents together
                totalSales: {$sum: 1},
                totalRevenue: {$sum: "$totalAmount"},
            }
        }
    ])

    const { totalSales, totalRevenue } = salesData[0] || { totalSales: 0, totalRevenue: 0 };

    return {
        users: totalUsers,
        products: totalProducts,
        totalSales,
        totalRevenue,
    }
};

export const getDailySalesData = async (startDate, endDate) => {
    try {
        const dailySalesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate,
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            {
                $sort: { _id: 1},
            }
        ]);
    
        // example of dailySalesData
        // [
        //     { 
        //          _id: "2021-09-01", 
        //          totalSales: 5,
        //          totalRevenue: 100,
        //     },
        // ]
    
        const dateArray = getDatesInRange(startDate, endDate);
        console.log(dateArray);     // ["2021-09-01", "2021-09-02", "2021-09-03", "2021-09-04", "2021-09-05", "2021-09-06", "2021-09-07"]
    
        return dateArray.map(date => {
            const foundData = dailySalesData.find(item => item._id === date);
    
            return {
                date,
                sales: foundData ?. sales || 0,
                revenue: foundData ?. revenue || 0,
            }
        });
    } catch (error) {
        throw error;
    }
}

function getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}