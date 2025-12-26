const express = require('express');
const salesModel = require('../models/sales');

const router = express.Router();

router.post('/api/sales/send', async (req, res) => {
    const saleData = req.body;

    try {
        const saleId = await salesModel.createSale(saleData);

        if (saleId) {
            res.status(201).json({ success: true });
        } else {
            res.status(400).json({ error: 'Failed to create sale' });
        }
    } catch (error) {
        console.error('Error creating sale', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;

