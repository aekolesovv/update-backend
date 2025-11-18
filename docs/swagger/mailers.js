/**
 * @swagger
 * /api/send-email:
 *   post:
 *     summary: Отправить email
 *     description: Отправляет email с указанными параметрами
 *     tags: [Mailers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - text
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email получателя
 *               subject:
 *                 type: string
 *                 description: Тема письма
 *               text:
 *                 type: string
 *                 description: Текст письма
 *     responses:
 *       200:
 *         description: Email успешно отправлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Неверные данные запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
