const { pool } = require('../utils/utils');

const createSale = async saleData => {
    const { order_num, sum, customer_email, payment_status_description, date } = saleData;

    try {
        const [rows, fields] = await pool.execute(
            `
                INSERT INTO sales (order_num, sum, customer_email, payment_status_description, date)
                VALUES (?, ?, ?, ?, ?)
            `,
            [order_num, sum, customer_email, payment_status_description, date]
        );

        console.log('Rows inserted:', rows);
        return rows.insertId;
    } catch (error) {
        console.error('Error in createSale:', error);
        throw error;
    }
};

module.exports = {
    createSale,
};
